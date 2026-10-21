package com.cinefin.tv.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VersionTest {
    @Test
    fun comparesDottedVersions() {
        assertTrue(compareVersions("12.0.0", "10.11.0") > 0)
        assertTrue(compareVersions("12.0.0-rc1", "12.0.0") == 0)
        assertTrue(compareVersions("11.9", "12.0") < 0)
        assertTrue(isServerSupported("12.2.0"))
        assertFalse(isServerSupported("10.10.10"))
        assertFalse(isServerSupported(null))
    }
}
