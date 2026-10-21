package com.cinefin.tv.core

data class CinefinDeviceProfile(
    val name: String,
    val maxStreamingBitrate: Int = 120_000_000,
    val maxStaticBitrate: Int = 120_000_000,
    val musicStreamingTranscodingBitrate: Int = 192_000,
    val directPlayProfiles: List<DirectPlaySlot>,
    val transcodingProfiles: List<TranscodeSlot>,
    val containerProfiles: List<ContainerSlot> = emptyList(),
    val codecProfiles: List<CodecSlot> = emptyList(),
    val subtitleProfiles: List<SubtitleSlot>,
)

data class DirectPlaySlot(
    val type: String,
    val container: String,
    val videoCodec: String? = null,
    val audioCodec: String? = null,
)

data class TranscodeSlot(
    val type: String,
    val container: String,
    val protocol: String,
    val videoCodec: String,
    val audioCodec: String,
    val estimateContentLength: Boolean = true,
    val copyTimestamps: Boolean = true,
)

data class ContainerSlot(
    val type: String,
    val container: String,
    val conditions: List<ProfileCondition>,
)

data class CodecSlot(
    val type: String,
    val codec: String,
    val conditions: List<ProfileCondition>,
)

data class ProfileCondition(
    val condition: String,
    val property: String,
    val value: String,
    val isRequired: Boolean = false,
)

data class SubtitleSlot(val format: String, val method: String)

fun buildDeviceProfile(table: CapabilityTable): CinefinDeviceProfile {
    val audioDirect = table.rows
        .filter { it.kind == FormatKind.AUDIO && (isPlayable(it.status) || it.status == FormatStatus.UNTESTED) }
        .flatMap { it.codecs }
        .filter { !it.contains('+') }
    val videoDirect = listOf("h264", "hevc", "vp9", "av1").filter { codec ->
        table.rows.any { r ->
            r.kind == FormatKind.VIDEO &&
                (isPlayable(r.status) || r.status == FormatStatus.UNTESTED) &&
                codec in r.codecs
        }
    }
    val audioList = audioDirect.map { it.lowercase() }.distinct().joinToString(",")
    val videoList = videoDirect.distinct().joinToString(",")
    val convert = resolveConvertTo(table, null, auto = true)
    val transcodeAudio = convertTargetCodec(convert)
    val mkvHasDoviRemux = table.rows.any {
        it.id.startsWith("container.mkv+dovi") && it.status == FormatStatus.REPACKAGED
    }

    return CinefinDeviceProfile(
        name = "Cinefin (${table.displayName})",
        directPlayProfiles = listOf(
            DirectPlaySlot(
                type = "Video",
                container = "mp4,m4v,mov,ts,m2ts,mkv",
                videoCodec = videoList,
                audioCodec = audioList,
            ),
        ),
        transcodingProfiles = listOf(
            TranscodeSlot(
                type = "Video",
                container = "ts",
                protocol = "http",
                videoCodec = if (videoList.contains("hevc")) "hevc,h264" else "h264",
                audioCodec = "$audioList,$transcodeAudio",
            ),
            TranscodeSlot(
                type = "Video",
                container = "mp4",
                protocol = "http",
                videoCodec = if (videoList.contains("av1")) "av1,hevc,h264" else "hevc,h264",
                audioCodec = "$audioList,$transcodeAudio",
            ),
        ),
        containerProfiles = if (mkvHasDoviRemux) {
            listOf(
                ContainerSlot(
                    type = "Video",
                    container = "mkv",
                    conditions = listOf(
                        ProfileCondition("NotEquals", "VideoRangeType", "DOVI"),
                        ProfileCondition("NotEquals", "VideoRangeType", "DOVIWithHDR10"),
                        ProfileCondition("NotEquals", "VideoRangeType", "DOVIWithEL"),
                    ),
                ),
            )
        } else {
            emptyList()
        },
        codecProfiles = listOf(
            CodecSlot(
                type = "Video",
                codec = "hevc",
                conditions = listOf(
                    ProfileCondition("EqualsAny", "VideoProfile", "main|main 10"),
                ),
            ),
        ),
        subtitleProfiles = listOf(
            SubtitleSlot("srt", "External"),
            SubtitleSlot("srt", "Embed"),
            SubtitleSlot("subrip", "External"),
            SubtitleSlot("vtt", "External"),
            SubtitleSlot("webvtt", "External"),
            SubtitleSlot("ass", "Encode"),
            SubtitleSlot("ssa", "Encode"),
            SubtitleSlot("pgssub", "Encode"),
            SubtitleSlot("pgs", "Encode"),
            SubtitleSlot("dvdsub", "Encode"),
            SubtitleSlot("dvbsub", "Encode"),
        ),
    )
}
