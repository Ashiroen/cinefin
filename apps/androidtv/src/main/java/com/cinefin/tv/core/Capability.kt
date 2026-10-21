package com.cinefin.tv.core

enum class FormatKind { AUDIO, VIDEO, CONTAINER }

enum class FormatStatus { DIRECT, SENT_TO_RECEIVER, REPACKAGED, CONVERTED, UNTESTED }

enum class FormatSource { CONFIRMED_BY_TEST, DETECTED_BY_DEVICE, SPEC }

enum class ConvertTargetId { PCM, EAC3, AC3 }

data class FormatRow(
    val id: String,
    val kind: FormatKind,
    val label: String,
    val status: FormatStatus,
    val source: FormatSource,
    val reason: String? = null,
    val convertTo: ConvertTargetId? = null,
    val autoConvert: Boolean = true,
    val codecs: List<String> = emptyList(),
    val detected: Boolean? = null,
    val userOverride: FormatStatus? = null,
)

data class CapabilityTable(
    val profileId: String,
    val displayName: String,
    val rows: List<FormatRow>,
)

data class ReceiverOverrides(
    val confirmed: Map<String, FormatStatus> = emptyMap(),
    val receiverShowed: Map<String, String> = emptyMap(),
)

data class ConvertTarget(
    val id: ConvertTargetId,
    val label: String,
    val lossless: Boolean,
    val jellyfinCodec: String,
)

val CONVERT_TARGETS = mapOf(
    ConvertTargetId.PCM to ConvertTarget(ConvertTargetId.PCM, "Lossless PCM", true, "pcm"),
    ConvertTargetId.EAC3 to ConvertTarget(ConvertTargetId.EAC3, "Dolby Digital Plus", false, "eac3"),
    ConvertTargetId.AC3 to ConvertTarget(ConvertTargetId.AC3, "Dolby Digital", false, "ac3"),
)

val CONVERT_RANK = listOf(ConvertTargetId.PCM, ConvertTargetId.EAC3, ConvertTargetId.AC3)

data class DetectedCapabilities(
    val modelName: String? = null,
    val manufacturer: String? = null,
    val sdkVersion: Int? = null,
    val hdrTypes: List<String> = emptyList(),
    val dolbyVision: Boolean = false,
    val audioEncodings: Set<String> = emptySet(),
    val audioOutput: String? = null,
    val maxAudioChannels: Int? = null,
    val ffmpegAvailable: Boolean = false,
)

fun cloneTable(table: CapabilityTable): CapabilityTable =
    table.copy(rows = table.rows.map { it.copy(codecs = it.codecs.toList()) })

fun findRow(table: CapabilityTable, id: String): FormatRow? = table.rows.find { it.id == id }

fun findRowByCodec(table: CapabilityTable, kind: FormatKind, codec: String): FormatRow? {
    val key = normalizeCodec(codec)
    return table.rows.find { row ->
        row.kind == kind && row.codecs.any { normalizeCodec(it) == key }
    }
}

fun normalizeCodec(codec: String): String = codec.lowercase().replace(Regex("[^a-z0-9+]"), "")

fun normalizeContainer(raw: String): String {
    val parts = raw.lowercase().split(Regex("[,\\s/]+")).map {
        it.replace(Regex("[^a-z0-9]"), "")
    }.filter { it.isNotEmpty() }
    val preferred = listOf("mp4", "m4v", "mkv", "matroska", "webm", "ts", "mpegts", "m2ts", "mov")
    for (want in preferred) {
        if (want in parts) {
            return when (want) {
                "matroska" -> "mkv"
                "mpegts" -> "ts"
                else -> want
            }
        }
    }
    return parts.firstOrNull() ?: normalizeCodec(raw)
}

fun applyOverrides(table: CapabilityTable, overrides: ReceiverOverrides?): CapabilityTable {
    if (overrides == null || overrides.confirmed.isEmpty()) return table
    return table.copy(
        rows = table.rows.map { row ->
            val next = overrides.confirmed[row.id] ?: return@map row
            row.copy(
                status = next,
                source = FormatSource.CONFIRMED_BY_TEST,
                userOverride = next,
                reason = if (next == FormatStatus.DIRECT || next == FormatStatus.SENT_TO_RECEIVER) {
                    null
                } else {
                    row.reason
                },
            )
        },
    )
}

fun isPlayable(status: FormatStatus): Boolean =
    status == FormatStatus.DIRECT || status == FormatStatus.SENT_TO_RECEIVER

fun listConfirmedConvertTargets(table: CapabilityTable): List<ConvertTargetId> =
    CONVERT_RANK.filter { id ->
        if (id == ConvertTargetId.PCM) return@filter isPcmConfirmed(table)
        val row = rowForTarget(table, id) ?: return@filter false
        row.source == FormatSource.CONFIRMED_BY_TEST || isPlayable(row.status)
    }

fun resolveConvertTo(
    table: CapabilityTable,
    preference: ConvertTargetId?,
    auto: Boolean = true,
): ConvertTargetId {
    val confirmed = listConfirmedConvertTargets(table)
    if (!auto && preference != null && preference in confirmed) return preference
    val tested = confirmed.find { id ->
        if (id == ConvertTargetId.PCM) isPcmConfirmed(table)
        else rowForTarget(table, id)?.source == FormatSource.CONFIRMED_BY_TEST
    }
    if (tested != null) return tested
    if (ConvertTargetId.EAC3 in confirmed) return ConvertTargetId.EAC3
    if (ConvertTargetId.AC3 in confirmed) return ConvertTargetId.AC3
    return ConvertTargetId.EAC3
}

fun convertTargetCodec(id: ConvertTargetId): String = CONVERT_TARGETS.getValue(id).jellyfinCodec

private fun isPcmConfirmed(table: CapabilityTable): Boolean {
    val row = findRow(table, "audio.pcm")
    return row?.source == FormatSource.CONFIRMED_BY_TEST && isPlayable(row.status)
}

private fun rowForTarget(table: CapabilityTable, id: ConvertTargetId): FormatRow? = when (id) {
    ConvertTargetId.PCM -> findRow(table, "audio.pcm")
    ConvertTargetId.EAC3 -> findRow(table, "audio.eac3")
    ConvertTargetId.AC3 -> findRow(table, "audio.ac3")
}

fun sourceCaption(row: FormatRow): String = when (row.source) {
    FormatSource.CONFIRMED_BY_TEST -> "Confirmed by test"
    FormatSource.SPEC -> "Shield / Google TV spec"
    FormatSource.DETECTED_BY_DEVICE -> "Detected by device / HDMI"
}

fun statusLabel(status: FormatStatus): String = when (status) {
    FormatStatus.DIRECT -> "Direct"
    FormatStatus.SENT_TO_RECEIVER -> "Sent to receiver"
    FormatStatus.REPACKAGED -> "Repackaged"
    FormatStatus.CONVERTED -> "Converted"
    FormatStatus.UNTESTED -> "Untested"
}

fun confirmedConvertLabel(table: CapabilityTable): String? {
    val pcm = findRow(table, "audio.pcm")
    if (pcm?.source == FormatSource.CONFIRMED_BY_TEST) return CONVERT_TARGETS.getValue(ConvertTargetId.PCM).label
    val id = resolveConvertTo(table, null, auto = true)
    val row = if (id == ConvertTargetId.AC3) findRow(table, "audio.ac3") else findRow(table, "audio.eac3")
    return if (row?.source == FormatSource.CONFIRMED_BY_TEST) CONVERT_TARGETS.getValue(id).label else null
}

/**
 * Merge HDMI / display probe results into the Shield seed.
 * Detected encodings become sent_to_receiver; missing ones stay untested
 * (still DirectPlay — the user can force convert). User overrides win.
 */
fun applyDetection(table: CapabilityTable, detected: DetectedCapabilities): CapabilityTable {
    val audioMap = mapOf(
        "audio.ac3" to setOf("ac3", "ac-3"),
        "audio.eac3" to setOf("eac3", "eac-3", "ec-3", "eac3-joc"),
        "audio.truehd" to setOf("truehd", "dolby-truehd"),
        "audio.dts" to setOf("dts"),
        "audio.dtshd" to setOf("dts-hd", "dtshd"),
        "audio.dtsx" to setOf("dts-uhd", "dtsx", "dts-x"),
        "audio.aac" to setOf("aac"),
        "audio.pcm" to setOf("pcm", "pcm-float"),
    )
    val hdr = detected.hdrTypes.map { it.lowercase() }.toSet()
    return table.copy(
        displayName = listOfNotNull(detected.manufacturer, detected.modelName)
            .joinToString(" ")
            .ifBlank { table.displayName },
        rows = table.rows.map { row ->
            if (row.userOverride != null) return@map row
            when {
                row.id in audioMap -> {
                    val keys = audioMap.getValue(row.id)
                    val hit = detected.audioEncodings.any { enc ->
                        keys.any { k -> enc.lowercase().contains(k) }
                    }
                    if (hit) {
                        row.copy(
                            status = FormatStatus.SENT_TO_RECEIVER,
                            source = FormatSource.DETECTED_BY_DEVICE,
                            detected = true,
                            reason = "HDMI reported this encoding. The AVR should show it on passthrough.",
                        )
                    } else if (row.kind == FormatKind.AUDIO && row.id != "audio.aac" && row.id != "audio.pcm") {
                        row.copy(
                            status = FormatStatus.UNTESTED,
                            source = FormatSource.DETECTED_BY_DEVICE,
                            detected = false,
                            reason = "This HDMI sink did not report the encoding. Direct play is still tried; turn the row off to force a convert.",
                        )
                    } else {
                        row.copy(detected = hit)
                    }
                }
                row.id == "video.hdr10" && hdr.any { it.contains("hdr10") || it.contains("dolby") } ->
                    row.copy(status = FormatStatus.DIRECT, source = FormatSource.DETECTED_BY_DEVICE, detected = true)
                row.id == "video.dovi.p5" || row.id == "video.dovi.p8" ->
                    row.copy(
                        status = if (detected.dolbyVision) FormatStatus.DIRECT else FormatStatus.UNTESTED,
                        source = FormatSource.DETECTED_BY_DEVICE,
                        detected = detected.dolbyVision,
                        reason = if (detected.dolbyVision) {
                            null
                        } else {
                            "This display did not report Dolby Vision. Profile 5/8 will try HDR10 / SDR fallback."
                        },
                    )
                else -> row
            }
        },
    )
}

fun toggleRow(table: CapabilityTable, id: String, status: FormatStatus): CapabilityTable =
    table.copy(
        rows = table.rows.map { row ->
            if (row.id != id) row
            else row.copy(
                status = status,
                userOverride = status,
                source = FormatSource.CONFIRMED_BY_TEST,
                convertTo = if (status == FormatStatus.CONVERTED) row.convertTo ?: ConvertTargetId.EAC3 else row.convertTo,
                autoConvert = status == FormatStatus.CONVERTED && row.autoConvert,
                reason = when (status) {
                    FormatStatus.DIRECT, FormatStatus.SENT_TO_RECEIVER ->
                        "Overridden in Easy AVR setup — passthrough / direct play."
                    FormatStatus.CONVERTED ->
                        "Overridden in Easy AVR setup — the server converts this codec."
                    else -> row.reason
                },
            )
        },
    )
