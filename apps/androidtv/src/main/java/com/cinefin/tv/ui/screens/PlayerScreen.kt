package com.cinefin.tv.ui.screens

import android.view.SurfaceView
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.util.UnstableApi
import androidx.tv.material3.Text
import com.cinefin.tv.core.CatalogItem
import com.cinefin.tv.core.PROGRESS_INTERVAL_MS
import com.cinefin.tv.core.PlaybackDecision
import com.cinefin.tv.core.ProgressEvent
import com.cinefin.tv.core.formatClock
import com.cinefin.tv.core.outputStateTitle
import com.cinefin.tv.data.longMeridian
import com.cinefin.tv.playback.CinefinPlayer
import com.cinefin.tv.playback.listenPlayer
import com.cinefin.tv.ui.components.CinefinButton
import com.cinefin.tv.ui.components.FocusBox
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.CinefinTheme
import com.cinefin.tv.ui.theme.LocalSafe
import kotlinx.coroutines.delay
import java.util.Calendar

@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    item: CatalogItem,
    playUrl: String?,
    startAt: Double,
    decision: PlaybackDecision?,
    passthrough: Boolean,
    matchFrameRate: Boolean,
    audioLabel: String?,
    onBack: (Double) -> Unit,
    onProgress: (ProgressEvent, Double) -> Unit,
) {
    val context = LocalContext.current
    val safe = LocalSafe.current
    var overlay by remember { mutableStateOf(true) }
    var paused by remember { mutableStateOf(false) }
    var current by remember { mutableDoubleStateOf(startAt) }
    var duration by remember { mutableDoubleStateOf(0.0) }
    val player = remember {
        CinefinPlayer(context, passthrough = passthrough, matchFrameRate = matchFrameRate)
    }

    DisposableEffect(player) {
        val listener = listenPlayer(
            player.exo,
            onPlaying = { paused = false },
            onPause = { paused = true },
            onEnded = { onBack(player.currentPositionSeconds()) },
            onError = { },
        )
        onDispose {
            player.exo.removeListener(listener)
            player.release()
        }
    }

    LaunchedEffect(playUrl) {
        if (!playUrl.isNullOrBlank()) {
            player.play(playUrl, (startAt * 1000).toLong(), decision)
        }
    }

    LaunchedEffect(player) {
        while (true) {
            current = player.currentPositionSeconds()
            duration = player.durationSeconds()
            delay(250)
        }
    }

    LaunchedEffect(player) {
        while (true) {
            delay(PROGRESS_INTERVAL_MS)
            onProgress(if (paused) ProgressEvent.PAUSE else ProgressEvent.PROGRESS, player.currentPositionSeconds())
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyUp) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.Back -> {
                        if (overlay) overlay = false else onBack(player.currentPositionSeconds())
                        true
                    }
                    Key.DirectionCenter, Key.Enter -> {
                        if (!overlay) overlay = true else player.togglePlay()
                        true
                    }
                    Key.DirectionLeft -> {
                        player.seekBy(-10)
                        overlay = true
                        true
                    }
                    Key.DirectionRight -> {
                        player.seekBy(30)
                        overlay = true
                        true
                    }
                    Key.DirectionUp, Key.DirectionDown -> {
                        overlay = true
                        false
                    }
                    else -> false
                }
            },
    ) {
        AndroidView(
            factory = { ctx ->
                SurfaceView(ctx).also { player.attach(it) }
            },
            modifier = Modifier.fillMaxSize(),
        )
        if (overlay) {
            Column(
                Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0x26000000), Color(0x0D000000), Color(0xB8000000)),
                        ),
                    )
                    .padding(horizontal = safe.x, vertical = safe.y),
                verticalArrangement = Arrangement.Bottom,
            ) {
                val now = Calendar.getInstance()
                Text(
                    "${now.get(Calendar.HOUR_OF_DAY)}:${now.get(Calendar.MINUTE).toString().padStart(2, '0')}",
                    color = CinefinColors.Muted,
                    fontSize = 30.sp,
                    modifier = Modifier.align(Alignment.End),
                )
                Text(
                    if (item.type.equals("Episode", true)) {
                        "S${item.parentIndexNumber ?: 1} E${item.indexNumber ?: 1} · ${item.seriesName ?: item.name}"
                    } else item.type,
                    color = CinefinColors.Muted,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                    Text(item.name, color = CinefinColors.Text, fontSize = 48.sp, fontWeight = FontWeight.SemiBold)
                    Column(horizontalAlignment = Alignment.End) {
                        if (decision != null) {
                            Text(
                                outputChip(decision, item),
                                color = CinefinColors.Text,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier
                                    .background(CinefinColors.Surface3, RoundedCornerShape(999.dp))
                                    .padding(horizontal = 14.dp, vertical = 6.dp),
                            )
                        }
                        Text(decision?.reason ?: "", color = CinefinColors.Muted, fontSize = 20.sp, maxLines = 2)
                    }
                }
                Spacer(Modifier.height(10.dp))
                val pct = if (duration > 0) (current / duration).toFloat().coerceIn(0f, 1f) else 0f
                Box(Modifier.fillMaxWidth().height(36.dp), contentAlignment = Alignment.CenterStart) {
                    Box(Modifier.fillMaxWidth().height(6.dp).background(Color(0xFF3F3F44), RoundedCornerShape(4.dp)))
                    Box(Modifier.fillMaxWidth(pct).height(6.dp).background(CinefinColors.Amber, RoundedCornerShape(4.dp)))
                    Box(
                        Modifier
                            .padding(start = 0.dp)
                            .fillMaxWidth(pct),
                    )
                    Box(
                        Modifier
                            .align(Alignment.CenterStart)
                            .padding(start = 0.dp)
                            .size(36.dp)
                            .background(CinefinColors.Amber, CircleShape),
                    )
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(formatClock(current), color = CinefinColors.Muted, fontSize = 22.sp)
                    Text("-${formatClock(maxOf(0.0, duration - current))}", color = CinefinColors.Muted, fontSize = 22.sp)
                }
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CinefinButton(audioLabel ?: "Audio", {})
                    CinefinButton("Subtitles", {})
                    Spacer(Modifier.weight(1f))
                    CinefinButton("↺ 10", { player.seekBy(-10) })
                    CinefinButton(if (paused) "▶" else "❚❚", { player.togglePlay() }, requestFocus = true)
                    CinefinButton("30 ↻", { player.seekBy(30) })
                    Spacer(Modifier.weight(1f))
                    CinefinButton("Back", { onBack(player.currentPositionSeconds()) }, ghost = true)
                }
            }
        }
    }
}

private fun outputChip(decision: PlaybackDecision, item: CatalogItem): String {
    val audio = item.mediaStreams.find { it.type.equals("Audio", true) && it.isDefault }
        ?: item.mediaStreams.find { it.type.equals("Audio", true) }
    val title = "${audio?.displayTitle.orEmpty()} ${audio?.codec.orEmpty()}".lowercase()
    if (decision.passthroughAudio && (title.contains("atmos") || title.contains("truehd"))) {
        return "TrueHD Atmos → AVR"
    }
    return outputStateTitle(decision.output)
}

@Preview(device = "id:tv_1080p", name = "Player overlay")
@Composable
fun PlayerOverlayPreview() {
    CinefinTheme {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            FocusBox(onClick = {}, modifier = Modifier.align(Alignment.Center)) {
                Text("Player preview — live ExoPlayer is used on device", color = CinefinColors.Text)
            }
        }
    }
}
