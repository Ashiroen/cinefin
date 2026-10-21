package com.cinefin.tv.core

enum class PlayMethod { DIRECT_PLAY, DIRECT_STREAM, TRANSCODE }

enum class OutputState { DIRECT, REPACKAGED, CONVERTED }

enum class VideoRange { SDR, HDR10, HDR10_PLUS, HLG, DOVI }

data class VideoInfo(
    val codec: String,
    val range: VideoRange,
    val doviProfile: Int? = null,
    val width: Int? = null,
    val height: Int? = null,
    val frameRate: Double? = null,
)

data class AudioInfo(
    val codec: String,
    val channels: Int? = null,
    val isAtmos: Boolean = false,
)

data class SubtitleInfo(
    val codec: String,
    val forced: Boolean = false,
)

data class ItemMedia(
    val container: String,
    val video: VideoInfo,
    val audio: AudioInfo,
    val subtitle: SubtitleInfo? = null,
)

data class PlaybackDecision(
    val playMethod: PlayMethod,
    val output: OutputState,
    val reason: String,
    val videoAction: String,
    val audioAction: String,
    val containerAction: String,
    val remuxTo: String? = null,
    val convertAudioTo: ConvertTargetId? = null,
    val burnSubtitles: Boolean,
    val preferProgressive: Boolean = true,
    val avoidHls: Boolean = true,
    val passthroughAudio: Boolean = true,
    val p7AsHdr10: Boolean = false,
)

private val BURN_IN_SUBS = setOf(
    "ass", "ssa", "pgs", "pgssub", "hdmvpgssubtitle", "dvb", "dvbsub", "dvdsub", "vobsub", "xsub",
)
private val TEXT_SUBS = setOf("srt", "subrip", "vtt", "webvtt", "sub", "text")

fun decidePlayback(
    media: ItemMedia,
    table: CapabilityTable,
    convertPreference: ConvertTargetId? = null,
    autoConvert: Boolean = true,
): PlaybackDecision {
    val container = normalizeContainer(media.container)
    val videoCodec = normalizeCodec(media.video.codec)
    val isDovi = media.video.range == VideoRange.DOVI || media.video.doviProfile != null
    val doviProfile = media.video.doviProfile
    val mkv = container == "mkv" || container == "matroska"
    val ts = container == "ts" || container == "m2ts" || container == "mpegts"
    val mp4 = container == "mp4" || container == "m4v" || container == "mov"

    val audioRow = findRowByCodec(table, FormatKind.AUDIO, media.audio.codec)
    val videoRow = videoRowFor(table, videoCodec, doviProfile)
    val burnSubtitles = needsBurnIn(media.subtitle)

    val audioPlays = audioRow == null || isPlayable(audioRow.status) || audioRow.status == FormatStatus.UNTESTED
    val mustConvertAudio = audioRow?.status == FormatStatus.CONVERTED

    val p7AsHdr10 = isDovi && doviProfile == 7
    val mkvDoviRow = findRow(table, "container.mkv+dovi")
    val doviNeedsRemux = isDovi && !p7AsHdr10 && mkv && mkvDoviRow?.status == FormatStatus.REPACKAGED
    val videoCodecPlays = when {
        videoRow == null -> true
        p7AsHdr10 -> isPlayable(findRowByCodec(table, FormatKind.VIDEO, "hevc")?.status ?: FormatStatus.DIRECT)
        else -> isPlayable(videoRow.status) ||
            videoRow.status == FormatStatus.REPACKAGED ||
            videoRow.status == FormatStatus.UNTESTED
    }

    val containerOk = !doviNeedsRemux && (mkv || ts || mp4)
    val convertAudioTo = if (mustConvertAudio) {
        resolveConvertTo(table, convertPreference ?: audioRow?.convertTo, autoConvert)
    } else {
        null
    }

    var videoAction = if (videoCodecPlays || p7AsHdr10) "copy" else "transcode"
    if (burnSubtitles) videoAction = "transcode"
    val audioAction = if (mustConvertAudio) "convert" else "copy"
    val containerAction = if (doviNeedsRemux || !containerOk) "remux" else "keep"
    val remuxTo = if (containerAction == "remux") if (videoCodec == "av1") "mp4" else "ts" else null

    val reasons = mutableListOf<String>()
    if (mustConvertAudio) {
        val label = audioRow?.label ?: media.audio.codec
        reasons += audioRow?.reason?.let { "$it Converted to ${targetName(convertAudioTo)}." }
            ?: "$label cannot passthrough on this setup. Converted to ${targetName(convertAudioTo)}."
    }
    if (doviNeedsRemux) {
        reasons += mkvDoviRow?.reason
            ?: "Dolby Vision in MKV is remuxed without touching picture or sound."
    }
    if (p7AsHdr10) {
        reasons += "Dolby Vision profile 7 plays as HDR10. The player uses the HEVC base layer and ignores the enhancement layer."
    }
    if (burnSubtitles) {
        val codec = media.subtitle?.codec ?: "this subtitle"
        reasons += "${codec.uppercase()} subtitles can't be drawn by the player, so they are burned in."
    }
    if (videoAction == "transcode" && !burnSubtitles) {
        reasons += "${media.video.codec} cannot be decoded here, so the server converts the picture."
    }

    val output: OutputState
    val playMethod: PlayMethod
    when {
        videoAction == "transcode" || audioAction == "convert" || burnSubtitles -> {
            output = OutputState.CONVERTED
            playMethod = PlayMethod.TRANSCODE
        }
        containerAction == "remux" -> {
            output = OutputState.REPACKAGED
            playMethod = PlayMethod.DIRECT_STREAM
        }
        else -> {
            output = OutputState.DIRECT
            playMethod = PlayMethod.DIRECT_PLAY
            if (reasons.isEmpty()) {
                reasons += directReason(media, audioRow?.status == FormatStatus.SENT_TO_RECEIVER)
            }
        }
    }

    return PlaybackDecision(
        playMethod = playMethod,
        output = output,
        reason = reasons.filter { it.isNotBlank() }.joinToString(" "),
        videoAction = videoAction,
        audioAction = audioAction,
        containerAction = containerAction,
        remuxTo = remuxTo,
        convertAudioTo = convertAudioTo,
        burnSubtitles = burnSubtitles,
        passthroughAudio = !mustConvertAudio,
        p7AsHdr10 = p7AsHdr10,
    )
}

fun needsBurnIn(sub: SubtitleInfo?): Boolean {
    if (sub == null) return false
    val c = normalizeCodec(sub.codec)
    if (c in TEXT_SUBS) return false
    if (c in BURN_IN_SUBS) return true
    return c !in TEXT_SUBS
}

private fun videoRowFor(table: CapabilityTable, codec: String, dovi: Int?): FormatRow? = when (dovi) {
    5 -> findRow(table, "video.dovi.p5")
    7 -> findRow(table, "video.dovi.p7")
    8 -> findRow(table, "video.dovi.p8")
    else -> findRowByCodec(table, FormatKind.VIDEO, codec)
}

private fun targetName(id: ConvertTargetId?): String = when (id) {
    ConvertTargetId.PCM -> "lossless PCM"
    ConvertTargetId.AC3 -> "Dolby Digital"
    else -> "Dolby Digital Plus"
}

private fun directReason(media: ItemMedia, toReceiver: Boolean): String {
    val audio = if (media.audio.isAtmos) "${media.audio.codec} Atmos" else media.audio.codec
    val dest = if (toReceiver) "sent to the receiver untouched" else "plays as-is"
    return "${media.video.codec.uppercase()} · $audio $dest."
}

fun outputStateTitle(output: OutputState): String = when (output) {
    OutputState.DIRECT -> "Direct"
    OutputState.REPACKAGED -> "Repackaged"
    OutputState.CONVERTED -> "Converted"
}
