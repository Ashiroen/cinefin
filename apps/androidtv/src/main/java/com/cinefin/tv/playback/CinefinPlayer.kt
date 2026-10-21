package com.cinefin.tv.playback

import android.content.Context
import android.os.Build
import android.view.Surface
import android.view.SurfaceView
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import androidx.media3.exoplayer.mediacodec.MediaCodecSelector
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import com.cinefin.tv.core.PlaybackDecision

@UnstableApi
class CinefinPlayer(
    context: Context,
    private val passthrough: Boolean,
    private val matchFrameRate: Boolean,
) {
    private val appContext = context.applicationContext
    private val trackSelector = DefaultTrackSelector(appContext).apply {
        setParameters(
            buildUponParameters()
                .setTunnelingEnabled(true)
                .setAllowAudioMixedMimeTypeAdaptiveness(true)
                .setAllowVideoMixedMimeTypeAdaptiveness(true),
        )
    }

    val exo: ExoPlayer = ExoPlayer.Builder(appContext)
        .setRenderersFactory(CinefinRenderersFactory(appContext, passthrough))
        .setTrackSelector(trackSelector)
        .setHandleAudioBecomingNoisy(true)
        .build()
        .apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                    .build(),
                true,
            )
            playWhenReady = true
        }

    fun play(url: String, startPositionMs: Long, decision: PlaybackDecision?) {
        val item = MediaItem.Builder()
            .setUri(url)
            .setMimeType(null)
            .build()
        exo.setMediaItem(item, startPositionMs.coerceAtLeast(0L))
        if (decision?.p7AsHdr10 == true) {
            // Profile 7: prefer the HDR10 base layer (HEVC) and ignore the EL.
            trackSelector.setParameters(
                trackSelector.buildUponParameters()
                    .setPreferredVideoMimeTypes("video/hevc", "video/avc"),
            )
        }
        exo.prepare()
        exo.play()
    }

    fun attach(surface: SurfaceView) {
        exo.setVideoSurfaceView(surface)
        if (matchFrameRate) {
            exo.addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_READY) applyFrameRate(surface.holder.surface)
                }
            })
        }
    }

    fun applyFrameRate(surface: Surface?) {
        if (!matchFrameRate || surface == null || !surface.isValid) return
        val format = exo.videoFormat ?: return
        val fps = format.frameRate
        if (fps <= 0f) return
        if (Build.VERSION.SDK_INT >= 30) {
            surface.setFrameRate(fps, Surface.FRAME_RATE_COMPATIBILITY_FIXED_SOURCE)
        }
    }

    fun selectAudio(groupIndex: Int, trackIndex: Int) {
        val groups = exo.currentTracks.groups
        if (groupIndex !in groups.indices) return
        val group = groups[groupIndex]
        exo.trackSelectionParameters = exo.trackSelectionParameters
            .buildUpon()
            .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(trackIndex)))
            .build()
    }

    fun currentPositionSeconds(): Double = exo.currentPosition / 1000.0

    fun durationSeconds(): Double = (exo.duration.takeIf { it > 0 } ?: 0L) / 1000.0

    fun seekBy(deltaSeconds: Int) {
        exo.seekTo((exo.currentPosition + deltaSeconds * 1000L).coerceAtLeast(0L))
    }

    fun togglePlay() {
        if (exo.isPlaying) exo.pause() else exo.play()
    }

    fun release() {
        exo.release()
    }
}

@UnstableApi
private class CinefinRenderersFactory(
    context: Context,
    private val passthrough: Boolean,
) : DefaultRenderersFactory(context) {
    init {
        setExtensionRendererMode(
            if (FfmpegSupport.isAvailable()) EXTENSION_RENDERER_MODE_ON else EXTENSION_RENDERER_MODE_OFF,
        )
        setEnableDecoderFallback(true)
        setMediaCodecSelector(MediaCodecSelector.DEFAULT)
    }

    override fun buildAudioSink(
        context: Context,
        enableFloatOutput: Boolean,
        enableAudioTrackPlaybackParams: Boolean,
    ): AudioSink {
        val builder = DefaultAudioSink.Builder(context)
            .setEnableFloatOutput(enableFloatOutput && !passthrough)
            .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
        return builder.build()
    }
}

fun listenPlayer(
    player: ExoPlayer,
    onPlaying: () -> Unit,
    onPause: () -> Unit,
    onEnded: () -> Unit,
    onError: (String) -> Unit,
): Player.Listener {
    val listener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (isPlaying) onPlaying() else onPause()
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            if (playbackState == Player.STATE_ENDED) onEnded()
        }

        override fun onPlayerError(error: PlaybackException) {
            onError(error.message ?: "Playback error")
        }
    }
    player.addListener(listener)
    return listener
}
