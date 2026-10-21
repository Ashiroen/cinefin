package com.cinefin.tv.playback

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.os.Build
import android.view.Display
import android.view.WindowManager
import com.cinefin.tv.core.DetectedCapabilities

object CapabilityProbe {
    fun probe(context: Context): DetectedCapabilities {
        val encodings = linkedSetOf<String>()
        val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        val devices = am?.getDevices(AudioManager.GET_DEVICES_OUTPUTS).orEmpty()
        val hdmi = devices.firstOrNull {
            it.type == AudioDeviceInfo.TYPE_HDMI ||
                it.type == AudioDeviceInfo.TYPE_HDMI_ARC ||
                (Build.VERSION.SDK_INT >= 31 && it.type == AudioDeviceInfo.TYPE_HDMI_EARC)
        }
        hdmi?.encodings?.forEach { enc ->
            encodingName(enc)?.let { encodings += it }
        }
        val route = when (hdmi?.type) {
            AudioDeviceInfo.TYPE_HDMI -> "HDMI"
            AudioDeviceInfo.TYPE_HDMI_ARC -> "HDMI ARC"
            else -> if (Build.VERSION.SDK_INT >= 31 && hdmi?.type == AudioDeviceInfo.TYPE_HDMI_EARC) {
                "HDMI eARC"
            } else {
                hdmi?.productName?.toString() ?: "device speakers"
            }
        }

        val display = (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay
        val hdr = mutableListOf<String>()
        var dv = false
        display.hdrCapabilities?.supportedHdrTypes?.forEach { type ->
            when (type) {
                Display.HdrCapabilities.HDR_TYPE_DOLBY_VISION -> {
                    hdr += "dolby-vision"
                    dv = true
                }
                Display.HdrCapabilities.HDR_TYPE_HDR10 -> hdr += "hdr10"
                Display.HdrCapabilities.HDR_TYPE_HLG -> hdr += "hlg"
                Display.HdrCapabilities.HDR_TYPE_HDR10_PLUS -> hdr += "hdr10+"
            }
        }

        return DetectedCapabilities(
            modelName = Build.MODEL,
            manufacturer = Build.MANUFACTURER,
            sdkVersion = Build.VERSION.SDK_INT,
            hdrTypes = hdr,
            dolbyVision = dv,
            audioEncodings = encodings,
            audioOutput = listOfNotNull(hdmi?.productName?.toString(), route).distinct().joinToString(" · "),
            maxAudioChannels = hdmi?.channelCounts?.maxOrNull(),
            ffmpegAvailable = FfmpegSupport.isAvailable(),
        )
    }

    private fun encodingName(enc: Int): String? = when (enc) {
        AudioFormat.ENCODING_AC3 -> "ac3"
        AudioFormat.ENCODING_E_AC3 -> "eac3"
        AudioFormat.ENCODING_E_AC3_JOC -> "eac3-joc"
        AudioFormat.ENCODING_DOLBY_TRUEHD -> "truehd"
        AudioFormat.ENCODING_DTS -> "dts"
        AudioFormat.ENCODING_DTS_HD -> "dts-hd"
        AudioFormat.ENCODING_PCM_16BIT, AudioFormat.ENCODING_PCM_FLOAT -> "pcm"
        AudioFormat.ENCODING_AAC_LC -> "aac"
        else -> if (Build.VERSION.SDK_INT >= 31 && enc == AudioFormat.ENCODING_DTS_UHD_P1) {
            "dts-uhd"
        } else {
            null
        }
    }
}

object FfmpegSupport {
    fun isAvailable(): Boolean = runCatching {
        val clazz = Class.forName("androidx.media3.decoder.ffmpeg.FfmpegLibrary")
        val method = clazz.getMethod("isAvailable")
        method.invoke(null) as? Boolean ?: false
    }.getOrDefault(false)
}
