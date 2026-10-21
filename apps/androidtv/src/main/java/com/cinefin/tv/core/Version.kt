package com.cinefin.tv.core

const val MIN_SERVER_VERSION = "12.0.0"
const val MIN_SERVER_VERSION_LABEL = "12.0"
const val CLIENT_NAME = "Cinefin"
const val CLIENT_VERSION = "0.1.0"

fun compareVersions(a: String, b: String): Int {
    val pa = parseVersion(a)
    val pb = parseVersion(b)
    val n = maxOf(pa.size, pb.size)
    for (i in 0 until n) {
        val da = pa.getOrElse(i) { 0 }
        val db = pb.getOrElse(i) { 0 }
        if (da != db) return if (da < db) -1 else 1
    }
    return 0
}

fun isServerSupported(version: String?): Boolean {
    if (version.isNullOrBlank()) return false
    return compareVersions(version, MIN_SERVER_VERSION) >= 0
}

private fun parseVersion(v: String): List<Int> =
    v.removePrefix("v").removePrefix("V").split('.').map { part ->
        Regex("^(\\d+)").find(part)?.groupValues?.get(1)?.toInt() ?: 0
    }
