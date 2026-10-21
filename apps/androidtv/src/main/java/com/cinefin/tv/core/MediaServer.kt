package com.cinefin.tv.core

/**
 * Backend-agnostic media server. [JellyfinServer] is the M1 implementation;
 * a Plex backend can be added later without changing the UI.
 */
interface MediaServer {
    val kind: String

    suspend fun discover(): List<PublicServer>

    suspend fun fetchPublicServer(address: String): PublicServer

    suspend fun fetchPublicUsers(address: String): List<PublicUser>

    suspend fun isQuickConnectEnabled(address: String): Boolean

    suspend fun startQuickConnect(address: String): QuickConnectSession?

    suspend fun pollQuickConnect(address: String, secret: String): Boolean

    suspend fun finishQuickConnect(address: String, secret: String, deviceId: String): AuthResult

    suspend fun loginByName(
        address: String,
        username: String,
        password: String,
        deviceId: String,
    ): AuthResult

    fun bindAccount(account: StoredAccount)

    fun signOut()

    suspend fun loadHome(): HomeModel

    suspend fun loadItem(id: String): CatalogItem

    suspend fun loadSeasons(seriesId: String): List<SeasonLite>

    suspend fun loadEpisodes(seriesId: String, seasonId: String): List<CatalogItem>

    suspend fun openPlayback(
        itemId: String,
        table: CapabilityTable,
        audioStreamIndex: Int? = null,
        subtitleStreamIndex: Int? = null,
        mediaSourceId: String? = null,
        startPositionTicks: Long? = null,
    ): PlaybackOpen

    suspend fun reportPlaying(
        itemId: String,
        mediaSourceId: String,
        playSessionId: String,
        positionSeconds: Double,
        audioStreamIndex: Int?,
        subtitleStreamIndex: Int?,
        playMethod: PlayMethod,
        event: ProgressEvent,
    )

    fun imageUrl(
        itemId: String,
        tag: String? = null,
        type: String = "Primary",
        width: Int,
        height: Int,
    ): String?
}

enum class ProgressEvent { START, PROGRESS, PAUSE, STOP }
