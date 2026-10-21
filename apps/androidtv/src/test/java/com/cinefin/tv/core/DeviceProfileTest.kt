package com.cinefin.tv.core

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceProfileTest {
    @Test
    fun advertisesPassthroughCodecsAndAvoidsHls() {
        val profile = buildDeviceProfile(SHIELD_TV_ONKYO)
        val audio = profile.directPlayProfiles.first().audioCodec.orEmpty()
        assertTrue(audio.contains("truehd"))
        assertTrue(audio.contains("dts"))
        assertTrue(audio.contains("eac3"))
        profile.transcodingProfiles.forEach { slot ->
            assertTrue(slot.protocol == "http")
            assertFalse(slot.container.contains("m3u", ignoreCase = true))
        }
        assertTrue(profile.containerProfiles.isEmpty())
    }

    @Test
    fun remuxConditionOnlyWhenMkvDoviIsRepackaged() {
        val remux = SHIELD_TV_ONKYO.copy(
            rows = SHIELD_TV_ONKYO.rows.map {
                if (it.id == "container.mkv+dovi") it.copy(status = FormatStatus.REPACKAGED) else it
            },
        )
        val profile = buildDeviceProfile(remux)
        assertTrue(profile.containerProfiles.isNotEmpty())
        assertTrue(profile.containerProfiles.first().conditions.any { it.value == "DOVI" })
    }
}
