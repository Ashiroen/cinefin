package com.cinefin.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.cinefin.tv.core.CatalogItem
import com.cinefin.tv.core.MediaStreamLite
import com.cinefin.tv.core.SeasonLite
import com.cinefin.tv.core.badgesFor
import com.cinefin.tv.core.formatClock
import com.cinefin.tv.core.formatRuntime
import com.cinefin.tv.core.ticksToSeconds
import com.cinefin.tv.data.fixtureSeasons
import com.cinefin.tv.data.longMeridian
import com.cinefin.tv.ui.components.CinefinButton
import com.cinefin.tv.ui.components.CinefinScreen
import com.cinefin.tv.ui.components.FocusBox
import com.cinefin.tv.ui.components.SectionLabel
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.CinefinTheme
import com.cinefin.tv.ui.theme.LocalSafe

@Composable
fun DetailsScreen(
    item: CatalogItem,
    seasons: List<SeasonLite>,
    episodes: List<CatalogItem>,
    selectedSeasonId: String?,
    audioIndex: Int?,
    subtitleIndex: Int?,
    sourceId: String?,
    picker: String?,
    convertLabel: String?,
    onPlay: () -> Unit,
    onPlayFromStart: () -> Unit,
    onPicker: (String?) -> Unit,
    onAudio: (Int) -> Unit,
    onSubtitle: (Int?) -> Unit,
    onSource: (String) -> Unit,
    onSeason: (String) -> Unit,
    onOpenEpisode: (CatalogItem) -> Unit,
    onSettings: () -> Unit,
    backdropUrl: String?,
) {
    val safe = LocalSafe.current
    val streams = item.mediaStreams
    val audios = streams.filter { it.type.equals("Audio", true) }
    val subs = streams.filter { it.type.equals("Subtitle", true) }
    val sources = item.mediaSources
    val currentAudio = audios.find { it.index == audioIndex } ?: audios.firstOrNull()
    val currentSub = subtitleIndex?.let { idx -> subs.find { it.index == idx } }
    val currentSource = sourceId?.let { id -> sources.find { it.id == id } } ?: sources.firstOrNull()
    val pos = item.userData.positionTicks ?: 0
    val dur = item.runtimeTicks ?: 0
    val canResume = pos > TICKS && dur - pos > TICKS

    CinefinScreen(Modifier.fillMaxSize(), fill = true) {
        if (!backdropUrl.isNullOrBlank()) {
            AsyncImage(
                backdropUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                alpha = 0.28f,
            )
        }
        Column(
            Modifier
                .fillMaxSize()
                .padding(start = safe.x, end = safe.x, top = 110.dp, bottom = safe.y)
                .verticalScroll(rememberScrollState()),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Spacer(Modifier.width(1.dp))
                FocusBox(onClick = onSettings, shape = RoundedCornerShape(8.dp), scaleOnFocus = false) {
                    Text("Settings", color = CinefinColors.Text, fontSize = 22.sp, modifier = Modifier.padding(12.dp))
                }
            }
            Text(item.name, color = CinefinColors.Text, fontSize = 64.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            Text(
                listOfNotNull(
                    item.year?.toString(),
                    item.runtimeTicks?.let { formatRuntime(ticksToSeconds(it)) },
                    item.officialRating,
                    item.genres.take(2).joinToString(", ").ifBlank { null },
                    item.communityRating?.let { "★ ${"%.1f".format(it)}" },
                ).joinToString(" · "),
                color = CinefinColors.Muted,
                fontSize = 24.sp,
            )
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                badgesFor(item).forEach { badge ->
                    Text(
                        badge,
                        color = CinefinColors.Text,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .background(CinefinColors.Surface3, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                }
            }
            item.overview?.let {
                Spacer(Modifier.height(16.dp))
                Text(it, color = Color(0xFFC8C8CC), fontSize = 24.sp, modifier = Modifier.width(880.dp))
            }
            if (canResume && dur > 0) {
                Spacer(Modifier.height(22.dp))
                Box(Modifier.width(420.dp).height(6.dp).background(Color(0xFF2E2E32), RoundedCornerShape(4.dp))) {
                    Box(Modifier.fillMaxWidth(pos.toFloat() / dur).height(6.dp).background(CinefinColors.Amber))
                }
                Text("${formatClock(ticksToSeconds(dur - pos))} left", color = CinefinColors.Muted, fontSize = 20.sp)
            }
            Spacer(Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp), verticalAlignment = Alignment.CenterVertically) {
                CinefinButton(
                    if (canResume) "Resume" else "▶ Play",
                    onPlay,
                    requestFocus = picker == null,
                )
                CinefinButton("Play from start", onPlayFromStart)
                PickerButton("Audio", currentAudio?.displayTitle ?: currentAudio?.codec ?: "Audio") { onPicker("audio") }
                PickerButton("Subtitles", currentSub?.displayTitle ?: "Off") { onPicker("subs") }
                if (sources.size > 1) {
                    PickerButton("Version", currentSource?.name ?: "Version") { onPicker("version") }
                }
            }
            if (seasons.isNotEmpty()) {
                Spacer(Modifier.height(28.dp))
                SectionLabel("Seasons")
                Spacer(Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    items(seasons) { season ->
                        FocusBox(
                            onClick = { onSeason(season.id) },
                            shape = RoundedCornerShape(18.dp),
                        ) {
                            Column(
                                Modifier
                                    .background(
                                        if (season.id == selectedSeasonId) CinefinColors.Surface2 else CinefinColors.Surface,
                                        RoundedCornerShape(18.dp),
                                    )
                                    .padding(18.dp, 14.dp),
                            ) {
                                Text(season.name, color = CinefinColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                                Text("${season.episodeCount ?: "—"} episodes", color = CinefinColors.Muted, fontSize = 18.sp)
                            }
                        }
                    }
                }
            }
            if (episodes.isNotEmpty()) {
                Spacer(Modifier.height(20.dp))
                SectionLabel("Episodes")
                Spacer(Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    items(episodes) { ep ->
                        FocusBox(onClick = { onOpenEpisode(ep) }, shape = RoundedCornerShape(16.dp)) {
                            Column(
                                Modifier
                                    .width(280.dp)
                                    .background(CinefinColors.Surface, RoundedCornerShape(16.dp))
                                    .padding(16.dp),
                            ) {
                                Text("E${ep.indexNumber ?: 0}", color = CinefinColors.Muted, fontSize = 16.sp)
                                Text(ep.name, color = CinefinColors.Text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold, maxLines = 2)
                            }
                        }
                    }
                }
            }
            val cast = item.people
            if (cast.isNotEmpty()) {
                Spacer(Modifier.height(28.dp))
                SectionLabel("Cast & crew")
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                    cast.take(6).forEach { person ->
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(160.dp)) {
                            Box(Modifier.size(96.dp).background(Color(0xFF3A2F36), CircleShape))
                            Text(person.name, color = CinefinColors.Text, fontSize = 20.sp)
                            Text(person.role, color = CinefinColors.Muted, fontSize = 18.sp)
                        }
                    }
                }
            }
        }
        if (picker != null) {
            Box(Modifier.fillMaxSize().background(Color(0x99000000))) {
                Column(
                    Modifier
                        .align(Alignment.CenterEnd)
                        .fillMaxHeight()
                        .width(720.dp)
                        .background(Color(0xFF111113))
                        .padding(safe.y, safe.y),
                ) {
                    when (picker) {
                        "audio" -> StreamPicker("Audio", audios, currentAudio?.index, convertLabel, onAudio) { onPicker(null) }
                        "subs" -> StreamPicker(
                            "Subtitles",
                            listOf(MediaStreamLite(-1, "Subtitle", displayTitle = "Off")) + subs,
                            currentSub?.index ?: -1,
                            null,
                            { idx -> onSubtitle(idx.takeIf { it >= 0 }) },
                        ) { onPicker(null) }
                        "version" -> {
                            Text("Version", color = CinefinColors.Text, fontSize = 44.sp, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(16.dp))
                            sources.forEach { src ->
                                FocusBox(onClick = { onSource(src.id) }, shape = RoundedCornerShape(22.dp), modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(18.dp, 16.dp)) {
                                        Text((if (src.id == currentSource?.id) "✓  " else "") + src.name, color = CinefinColors.Text, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                                        Text(src.container ?: "", color = CinefinColors.Muted, fontSize = 20.sp)
                                    }
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                            CinefinButton("Close", { onPicker(null) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PickerButton(label: String, value: String, onClick: () -> Unit) {
    FocusBox(onClick = onClick, shape = RoundedCornerShape(999.dp)) {
        Row(
            Modifier
                .width(360.dp)
                .height(92.dp)
                .background(CinefinColors.Surface, RoundedCornerShape(999.dp))
                .padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(label, color = CinefinColors.Muted, fontSize = 16.sp)
                Text(value, color = CinefinColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            }
            Text("›", color = CinefinColors.Muted, fontSize = 24.sp)
        }
    }
}

@Composable
private fun StreamPicker(
    title: String,
    tracks: List<MediaStreamLite>,
    selected: Int?,
    convertLabel: String?,
    onPick: (Int) -> Unit,
    onClose: () -> Unit,
) {
    Text(title, color = CinefinColors.Text, fontSize = 44.sp, fontWeight = FontWeight.SemiBold)
    Text("Choose a track. The note shows how it reaches your receiver.", color = CinefinColors.Muted, fontSize = 22.sp)
    Spacer(Modifier.height(20.dp))
    tracks.forEach { track ->
        val dts = (track.codec ?: "").lowercase().contains("dts")
        FocusBox(
            onClick = { onPick(track.index) },
            requestFocus = track.index == selected,
            shape = RoundedCornerShape(22.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(18.dp, 16.dp)) {
                Text(
                    (if (track.index == selected) "✓  " else "") + (track.displayTitle ?: track.codec ?: "Track"),
                    color = CinefinColors.Text,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    when {
                        track.index < 0 -> "No subtitles"
                        dts -> "Converted · ${convertLabel ?: "passthrough if HDMI reports DTS"}"
                        (track.codec ?: "").equals("truehd", true) -> "To receiver (passthrough)"
                        else -> "To receiver (passthrough)"
                    },
                    color = CinefinColors.Muted,
                    fontSize = 20.sp,
                )
            }
        }
    }
    Spacer(Modifier.height(16.dp))
    CinefinButton("Close", onClose)
}

private const val TICKS = 10_000_000L

@Preview(device = "id:tv_1080p", name = "Details")
@Composable
fun DetailsPreview() {
    CinefinTheme {
        DetailsScreen(
            item = longMeridian,
            seasons = fixtureSeasons,
            episodes = emptyList(),
            selectedSeasonId = "meridian-s1",
            audioIndex = 1,
            subtitleIndex = null,
            sourceId = null,
            picker = null,
            convertLabel = null,
            onPlay = {},
            onPlayFromStart = {},
            onPicker = {},
            onAudio = {},
            onSubtitle = {},
            onSource = {},
            onSeason = {},
            onOpenEpisode = {},
            onSettings = {},
            backdropUrl = null,
        )
    }
}
