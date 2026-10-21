package com.cinefin.tv.core

import java.net.URI
import java.util.UUID

/** Assume http:// and port 8096 when the user types a bare host. */
fun normalizeServerAddress(raw: String): String {
    var value = raw.trim()
    if (value.isEmpty()) return value
    if (!value.startsWith("http://", ignoreCase = true) &&
        !value.startsWith("https://", ignoreCase = true)
    ) {
        value = "http://$value"
    }
    return try {
        val uri = URI(value)
        val host = uri.host ?: return value.trimEnd('/')
        val scheme = uri.scheme ?: "http"
        val port =
            if (uri.port == -1 && scheme.equals("http", ignoreCase = true)) 8096 else uri.port
        val authority = if (port == -1) host else "$host:$port"
        "$scheme://$authority"
    } catch (_: Exception) {
        value.trimEnd('/')
    }
}

fun deviceIdKey(installId: String, serverId: String, userId: String): String =
    "$installId:$serverId:$userId"

fun randomId(): String = UUID.randomUUID().toString().replace("-", "")
