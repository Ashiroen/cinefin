package com.cinefin.tv.core

import org.junit.Assert.assertEquals
import org.junit.Test

class AddressTest {
    @Test
    fun assumesHttpAnd8096() {
        assertEquals("http://192.168.1.20:8096", normalizeServerAddress("192.168.1.20"))
        assertEquals("http://192.168.1.20:8096", normalizeServerAddress("192.168.1.20:8096"))
        assertEquals("https://media.example", normalizeServerAddress("https://media.example"))
        assertEquals("http://jellyfin.local:8096", normalizeServerAddress("http://jellyfin.local/"))
    }

    @Test
    fun deviceIdIsPerInstallServerUser() {
        assertEquals("a:b:c", deviceIdKey("a", "b", "c"))
        assertEquals(32, randomId().length)
    }
}
