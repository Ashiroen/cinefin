package com.cinefin.tv.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackDecisionTest {
    private fun hevc(audio: AudioInfo, container: String = "mkv", video: VideoInfo? = null) = ItemMedia(
        container = container,
        video = video ?: VideoInfo("hevc", VideoRange.HDR10),
        audio = audio,
    )

    @Test
    fun shieldDirectPlaysTruehdByDefault() {
        val d = decidePlayback(hevc(AudioInfo("truehd", 8, true)), SHIELD_TV_ONKYO)
        assertEquals(OutputState.DIRECT, d.output)
        assertEquals(PlayMethod.DIRECT_PLAY, d.playMethod)
        assertEquals("copy", d.audioAction)
        assertTrue(d.passthroughAudio)
        assertTrue(d.avoidHls)
    }

    @Test
    fun shieldDirectPlaysDtsFamily() {
        listOf("dts", "dtshd", "dtsx", "dts-hd").forEach { codec ->
            val d = decidePlayback(hevc(AudioInfo(codec, 8)), SHIELD_TV_ONKYO)
            assertEquals(codec, OutputState.DIRECT, d.output)
            assertEquals(PlayMethod.DIRECT_PLAY, d.playMethod)
        }
    }

    @Test
    fun convertingOverrideForcesServerConvert() {
        val table = toggleRow(cloneTable(SHIELD_TV_ONKYO), "audio.dts", FormatStatus.CONVERTED)
        val d = decidePlayback(hevc(AudioInfo("dts", 6)), table)
        assertEquals(OutputState.CONVERTED, d.output)
        assertEquals("convert", d.audioAction)
        assertEquals(ConvertTargetId.EAC3, d.convertAudioTo)
        assertEquals("copy", d.videoAction)
    }

    @Test
    fun confirmedPcmBecomesAutoTarget() {
        val table = applyOverrides(
            cloneTable(SHIELD_TV_ONKYO),
            ReceiverOverrides(confirmed = mapOf("audio.pcm" to FormatStatus.DIRECT)),
        )
        assertEquals(ConvertTargetId.PCM, resolveConvertTo(table, null, true))
        val converted = toggleRow(table, "audio.dts", FormatStatus.CONVERTED)
        val d = decidePlayback(hevc(AudioInfo("dts", 6)), converted)
        assertEquals(ConvertTargetId.PCM, d.convertAudioTo)
    }

    @Test
    fun mkvDolbyVisionIsDirectOnShield() {
        val d = decidePlayback(
            hevc(
                AudioInfo("eac3", 8, true),
                container = "mkv",
                video = VideoInfo("hevc", VideoRange.DOVI, doviProfile = 8),
            ),
            SHIELD_TV_ONKYO,
        )
        assertEquals(OutputState.DIRECT, d.output)
        assertEquals("keep", d.containerAction)
        assertFalse(d.p7AsHdr10)
    }

    @Test
    fun profile7PlaysHdr10BaseNotATranscode() {
        val d = decidePlayback(
            hevc(
                AudioInfo("truehd", 8, true),
                video = VideoInfo("hevc", VideoRange.DOVI, doviProfile = 7),
            ),
            SHIELD_TV_ONKYO,
        )
        assertEquals("copy", d.videoAction)
        assertTrue(d.p7AsHdr10)
        assertTrue(d.reason.contains("profile 7", ignoreCase = true))
        assertEquals(PlayMethod.DIRECT_PLAY, d.playMethod)
    }

    @Test
    fun pgsBurnsIn() {
        assertTrue(needsBurnIn(SubtitleInfo("pgs")))
        assertFalse(needsBurnIn(SubtitleInfo("srt")))
        val d = decidePlayback(
            ItemMedia(
                container = "mkv",
                video = VideoInfo("hevc", VideoRange.HDR10),
                audio = AudioInfo("eac3", 6),
                subtitle = SubtitleInfo("pgs"),
            ),
            SHIELD_TV_ONKYO,
        )
        assertTrue(d.burnSubtitles)
        assertEquals(PlayMethod.TRANSCODE, d.playMethod)
    }

    @Test
    fun untestedStillDirectPlays() {
        val table = SHIELD_TV_ONKYO.copy(
            rows = SHIELD_TV_ONKYO.rows.map {
                if (it.id == "audio.truehd") it.copy(status = FormatStatus.UNTESTED) else it
            },
        )
        val d = decidePlayback(hevc(AudioInfo("truehd", 8, true)), table)
        assertEquals(OutputState.DIRECT, d.output)
        assertNull(d.convertAudioTo)
    }

    @Test
    fun detectionPromotesReportedEncodings() {
        val detected = DetectedCapabilities(audioEncodings = setOf("ac3", "eac3-joc", "truehd"))
        val table = applyDetection(cloneTable(SHIELD_TV_ONKYO), detected)
        assertEquals(FormatStatus.SENT_TO_RECEIVER, findRow(table, "audio.ac3")?.status)
        assertEquals(FormatStatus.SENT_TO_RECEIVER, findRow(table, "audio.eac3")?.status)
        assertEquals(FormatSource.DETECTED_BY_DEVICE, findRow(table, "audio.truehd")?.source)
    }
}
