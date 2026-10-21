package com.cinefin.tv.core

const val TICKS_PER_SECOND = 10_000_000L
const val PROGRESS_INTERVAL_MS = 10_000L

data class PublicServer(
    val id: String,
    val name: String,
    val address: String,
    val version: String,
    val supported: Boolean,
)

data class PublicUser(
    val id: String,
    val name: String,
    val primaryImageTag: String? = null,
)

data class MediaStreamLite(
    val index: Int,
    val type: String,
    val codec: String? = null,
    val language: String? = null,
    val displayTitle: String? = null,
    val channels: Int? = null,
    val isDefault: Boolean = false,
    val isForced: Boolean = false,
    val videoRangeType: String? = null,
    val profile: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    val bitDepth: Int? = null,
    val videoRange: String? = null,
)

data class MediaSourceLite(
    val id: String,
    val name: String,
    val container: String? = null,
    val path: String? = null,
    val bitrate: Int? = null,
    val streams: List<MediaStreamLite> = emptyList(),
)

data class PersonLite(
    val name: String,
    val role: String,
    val imageTag: String? = null,
    val id: String? = null,
)

data class CatalogItem(
    val id: String,
    val name: String,
    val type: String,
    val overview: String? = null,
    val year: Int? = null,
    val runtimeTicks: Long? = null,
    val officialRating: String? = null,
    val communityRating: Double? = null,
    val genres: List<String> = emptyList(),
    val seriesName: String? = null,
    val seriesId: String? = null,
    val seasonName: String? = null,
    val seasonId: String? = null,
    val indexNumber: Int? = null,
    val parentIndexNumber: Int? = null,
    val imageTag: String? = null,
    val backdropTag: String? = null,
    val badges: List<String> = emptyList(),
    val container: String? = null,
    val mediaStreams: List<MediaStreamLite> = emptyList(),
    val mediaSources: List<MediaSourceLite> = emptyList(),
    val people: List<PersonLite> = emptyList(),
    val userData: UserDataLite = UserDataLite(),
    val childCount: Int? = null,
)

data class UserDataLite(
    val positionTicks: Long? = null,
    val played: Boolean = false,
)

data class HomeModel(
    val resume: List<CatalogItem> = emptyList(),
    val nextUp: List<CatalogItem> = emptyList(),
    val libraries: List<LibraryRow> = emptyList(),
)

data class LibraryRow(
    val id: String,
    val name: String,
    val items: List<CatalogItem>,
)

data class SeasonLite(
    val id: String,
    val name: String,
    val indexNumber: Int?,
    val episodeCount: Int? = null,
    val imageTag: String? = null,
)

data class AuthResult(
    val userId: String,
    val userName: String,
    val token: String,
    val serverId: String?,
)

data class QuickConnectSession(
    val code: String,
    val secret: String,
)

data class PlaybackOpen(
    val url: String,
    val playSessionId: String,
    val mediaSourceId: String,
    val item: CatalogItem,
)

data class StoredAccount(
    val serverId: String,
    val serverName: String,
    val address: String,
    val userId: String,
    val userName: String,
    val token: String,
    val deviceId: String,
)

fun secondsToTicks(seconds: Double): Long = kotlin.math.round(seconds * TICKS_PER_SECOND).toLong()

fun ticksToSeconds(ticks: Long): Double = ticks.toDouble() / TICKS_PER_SECOND

fun formatClock(seconds: Double): String {
    if (!seconds.isFinite()) return "0:00"
    val sign = if (seconds < 0) "-" else ""
    val s = kotlin.math.abs(seconds.toInt())
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) {
        "$sign$h:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}"
    } else {
        "$sign$m:${sec.toString().padStart(2, '0')}"
    }
}

fun formatRuntime(seconds: Double): String {
    if (!seconds.isFinite() || seconds <= 0) return ""
    val h = (seconds / 3600).toInt()
    val m = kotlin.math.round((seconds % 3600) / 60).toInt()
    return when {
        h > 0 -> "${h}h ${m}m"
        m < 1 -> "${maxOf(1, kotlin.math.round(seconds).toInt())}s"
        else -> "${m}m"
    }
}

fun itemToMedia(
    item: CatalogItem,
    audioIndex: Int? = null,
    subtitleIndex: Int? = null,
    sourceId: String? = null,
): ItemMedia? {
    val source = sourceId?.let { id -> item.mediaSources.find { it.id == id } }
    val streams = source?.streams?.ifEmpty { null } ?: item.mediaStreams
    val video = streams.find { it.type.equals("Video", true) } ?: return null
    val audios = streams.filter { it.type.equals("Audio", true) }
    val audio = audioIndex?.let { idx -> audios.find { it.index == idx } } ?: audios.firstOrNull()
        ?: return null
    val subs = streams.filter { it.type.equals("Subtitle", true) }
    val sub = subtitleIndex?.let { idx -> subs.find { it.index == idx } }
    val range = (video.videoRangeType ?: video.videoRange ?: "").lowercase()
    val prof = (video.profile ?: "").lowercase()
    val doviProfile = when {
        prof.contains("05") || prof.contains("profile 5") -> 5
        prof.contains("07") || prof.contains("profile 7") -> 7
        prof.contains("08") || prof.contains("profile 8") -> 8
        prof.contains("10") || prof.contains("profile 10") -> 10
        else -> null
    }
    return ItemMedia(
        container = normalizeContainer(source?.container ?: item.container ?: "mkv"),
        video = VideoInfo(
            codec = video.codec ?: "hevc",
            range = when {
                range.contains("dovi") || range.contains("dolby") -> VideoRange.DOVI
                range.contains("hdr10+") || range.contains("hdr10plus") -> VideoRange.HDR10_PLUS
                range.contains("hlg") -> VideoRange.HLG
                range.contains("hdr") -> VideoRange.HDR10
                else -> VideoRange.SDR
            },
            doviProfile = doviProfile,
            width = video.width,
            height = video.height,
        ),
        audio = AudioInfo(
            codec = audio.codec ?: "aac",
            channels = audio.channels,
            isAtmos = (audio.displayTitle ?: "").lowercase().contains("atmos"),
        ),
        subtitle = sub?.let { SubtitleInfo(codec = it.codec ?: "srt", forced = it.isForced) },
    )
}

fun badgesFor(item: CatalogItem): List<String> {
    if (item.badges.isNotEmpty()) return item.badges
    val out = linkedSetOf<String>()
    val streams = item.mediaStreams
    val video = streams.find { it.type.equals("Video", true) }
    val range = (video?.videoRangeType ?: "").lowercase()
    if (range.contains("dovi") || range.contains("dolby")) out += "Dolby Vision"
    when {
        range.contains("hdr10+") -> out += "HDR10+"
        range.contains("hdr") -> out += "HDR10"
        range.contains("hlg") -> out += "HLG"
    }
    if ((video?.width ?: 0) >= 3800) out += "4K"
    for (a in streams.filter { it.type.equals("Audio", true) }) {
        val title = "${a.displayTitle.orEmpty()} ${a.codec.orEmpty()}".lowercase()
        if (title.contains("atmos")) out += "Dolby Atmos"
        if (title.contains("truehd")) out += "TrueHD 7.1"
        when {
            title.contains("dts:x") || title.contains("dtsx") -> out += "DTS:X"
            title.contains("dts-hd") || title.contains("dtshd") -> out += "DTS-HD"
        }
    }
    return out.toList()
}
