package com.cinefin.tv.jellyfin

import android.content.Context
import com.cinefin.tv.core.AuthResult
import com.cinefin.tv.core.CLIENT_NAME
import com.cinefin.tv.core.CLIENT_VERSION
import com.cinefin.tv.core.CapabilityTable
import com.cinefin.tv.core.CatalogItem
import com.cinefin.tv.core.CinefinDeviceProfile
import com.cinefin.tv.core.HomeModel
import com.cinefin.tv.core.LibraryRow
import com.cinefin.tv.core.MediaServer
import com.cinefin.tv.core.MediaSourceLite
import com.cinefin.tv.core.MediaStreamLite
import com.cinefin.tv.core.PersonLite
import com.cinefin.tv.core.PlayMethod
import com.cinefin.tv.core.PlaybackOpen
import com.cinefin.tv.core.ProgressEvent
import com.cinefin.tv.core.PublicServer
import com.cinefin.tv.core.PublicUser
import com.cinefin.tv.core.QuickConnectSession
import com.cinefin.tv.core.SeasonLite
import com.cinefin.tv.core.StoredAccount
import com.cinefin.tv.core.UserDataLite
import com.cinefin.tv.core.buildDeviceProfile
import com.cinefin.tv.core.isServerSupported
import com.cinefin.tv.core.normalizeServerAddress
import com.cinefin.tv.core.randomId
import com.cinefin.tv.core.secondsToTicks
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.withTimeoutOrNull
import org.jellyfin.sdk.api.client.ApiClient
import org.jellyfin.sdk.api.client.extensions.authenticationApi
import org.jellyfin.sdk.api.client.extensions.libraryApi
import org.jellyfin.sdk.api.client.extensions.mediaInfoApi
import org.jellyfin.sdk.api.client.extensions.sessionApi
import org.jellyfin.sdk.api.client.extensions.showApi
import org.jellyfin.sdk.api.client.extensions.systemApi
import org.jellyfin.sdk.api.client.extensions.userApi
import org.jellyfin.sdk.api.client.extensions.userViewApi
import org.jellyfin.sdk.createJellyfin
import org.jellyfin.sdk.model.ClientInfo
import org.jellyfin.sdk.model.DeviceInfo
import org.jellyfin.sdk.model.api.AuthenticateUserByName
import org.jellyfin.sdk.model.api.BaseItemDto
import org.jellyfin.sdk.model.api.BaseItemKind
import org.jellyfin.sdk.model.api.CodecProfile
import org.jellyfin.sdk.model.api.CodecType
import org.jellyfin.sdk.model.api.CollectionType
import org.jellyfin.sdk.model.api.ContainerProfile
import org.jellyfin.sdk.model.api.DeviceProfile
import org.jellyfin.sdk.model.api.DirectPlayProfile
import org.jellyfin.sdk.model.api.DlnaProfileType
import org.jellyfin.sdk.model.api.EncodingContext
import org.jellyfin.sdk.model.api.ImageType
import org.jellyfin.sdk.model.api.ItemFields
import org.jellyfin.sdk.model.api.MediaStreamProtocol
import org.jellyfin.sdk.model.api.PlayMethod as JfPlayMethod
import org.jellyfin.sdk.model.api.PlaybackInfoDto
import org.jellyfin.sdk.model.api.PlaybackOrder
import org.jellyfin.sdk.model.api.QuickConnectDto
import org.jellyfin.sdk.model.api.PlaybackProgressInfo
import org.jellyfin.sdk.model.api.PlaybackStartInfo
import org.jellyfin.sdk.model.api.PlaybackStopInfo
import org.jellyfin.sdk.model.api.ProfileCondition
import org.jellyfin.sdk.model.api.ProfileConditionType
import org.jellyfin.sdk.model.api.ProfileConditionValue
import org.jellyfin.sdk.model.api.RepeatMode
import org.jellyfin.sdk.model.api.SubtitleDeliveryMethod
import org.jellyfin.sdk.model.api.SubtitleProfile
import org.jellyfin.sdk.model.api.TranscodingProfile
import java.util.UUID

class JellyfinServer(
    context: Context,
    private val installId: String,
) : MediaServer {
    override val kind: String = "jellyfin"

    @Suppress("unused")
    private val appContext = context.applicationContext
    private var account: StoredAccount? = null
    private var api: ApiClient? = null

    private fun jellyfin(deviceId: String) = createJellyfin {
        clientInfo = ClientInfo(name = CLIENT_NAME, version = CLIENT_VERSION)
        deviceInfo = DeviceInfo(name = deviceName(), id = deviceId)
    }

    private fun anonymousApi(address: String, deviceId: String = installId): ApiClient =
        jellyfin(deviceId).createApi(baseUrl = normalizeServerAddress(address))

    private fun requireApi(): Pair<ApiClient, StoredAccount> {
        val acc = account ?: error("Not signed in")
        val client = api ?: error("Not signed in")
        return client to acc
    }

    private fun deviceName(): String {
        val m = android.os.Build.MODEL.orEmpty()
        val man = android.os.Build.MANUFACTURER.orEmpty()
        return listOf(man, m).filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Android TV" }
    }

    override suspend fun discover(): List<PublicServer> {
        val found = withTimeoutOrNull(4_000) {
            jellyfin(installId).discovery.discoverLocalServers().toList()
        }.orEmpty()
        return found.mapNotNull { info ->
            val address = info.address ?: return@mapNotNull null
            try {
                fetchPublicServer(address)
            } catch (_: Exception) {
                PublicServer(
                    id = info.id ?: address,
                    name = info.name ?: "Jellyfin",
                    address = normalizeServerAddress(address),
                    version = "",
                    supported = false,
                )
            }
        }
    }

    override suspend fun fetchPublicServer(address: String): PublicServer {
        val url = normalizeServerAddress(address)
        val client = anonymousApi(url)
        val info by client.systemApi.getPublicSystemInfo()
        val version = info.version.orEmpty()
        return PublicServer(
            id = info.id ?: url,
            name = info.serverName ?: "Jellyfin",
            address = url,
            version = version,
            supported = isServerSupported(version),
        )
    }

    override suspend fun fetchPublicUsers(address: String): List<PublicUser> {
        val client = anonymousApi(address)
        val users by client.userApi.getPublicUsers()
        return users.map {
            PublicUser(
                id = it.id.toString(),
                name = it.name ?: "User",
                primaryImageTag = it.primaryImageTag,
            )
        }
    }

    override suspend fun isQuickConnectEnabled(address: String): Boolean = try {
        val client = anonymousApi(address)
        val enabled by client.authenticationApi.getQuickConnectEnabled()
        enabled
    } catch (_: Exception) {
        false
    }

    override suspend fun startQuickConnect(address: String): QuickConnectSession? = try {
        val client = anonymousApi(address)
        val state by client.authenticationApi.initiateQuickConnect()
        QuickConnectSession(code = state.code, secret = state.secret)
    } catch (_: Exception) {
        null
    }

    override suspend fun pollQuickConnect(address: String, secret: String): Boolean {
        val client = anonymousApi(address)
        val state by client.authenticationApi.getQuickConnectState(secret)
        return state.authenticated
    }

    override suspend fun finishQuickConnect(
        address: String,
        secret: String,
        deviceId: String,
    ): AuthResult {
        val client = anonymousApi(address, deviceId)
        val result by client.authenticationApi.authenticateWithQuickConnect(QuickConnectDto(secret))
        val token = result.accessToken ?: error("Quick Connect returned no token")
        return AuthResult(
            userId = result.user?.id?.toString().orEmpty(),
            userName = result.user?.name.orEmpty(),
            token = token,
            serverId = result.serverId,
        )
    }

    override suspend fun loginByName(
        address: String,
        username: String,
        password: String,
        deviceId: String,
    ): AuthResult {
        val client = anonymousApi(address, deviceId)
        val result by client.authenticationApi.authenticateUserByName(AuthenticateUserByName(username, password))
        val token = result.accessToken ?: error("Sign-in returned no token")
        return AuthResult(
            userId = result.user?.id?.toString().orEmpty(),
            userName = result.user?.name ?: username,
            token = token,
            serverId = result.serverId,
        )
    }

    override fun bindAccount(account: StoredAccount) {
        this.account = account
        this.api = jellyfin(account.deviceId).createApi(
            baseUrl = account.address,
            accessToken = account.token,
        )
    }

    override fun signOut() {
        account = null
        api = null
    }

    private val itemFields = listOf(
        ItemFields.OVERVIEW,
        ItemFields.GENRES,
        ItemFields.MEDIA_STREAMS,
        ItemFields.MEDIA_SOURCES,
        ItemFields.PEOPLE,
        ItemFields.PRIMARY_IMAGE_ASPECT_RATIO,
    )

    override suspend fun loadHome(): HomeModel {
        val (client, acc) = requireApi()
        val userId = UUID.fromString(acc.userId)
        val resume by client.libraryApi.getResumeItems(userId = userId, limit = 12, fields = itemFields)
        val next by client.showApi.getNextUp(userId = userId, limit = 12, fields = itemFields)
        val views by client.userViewApi.getUserViews(userId = userId)
        var folders = (views.items.orEmpty()).filter { folder ->
            val type = folder.collectionType
            type != null && type != CollectionType.PLAYLISTS && type != CollectionType.BOXSETS
        }
        if (folders.isEmpty()) {
            val root by client.libraryApi.getItems(userId = userId, recursive = false)
            folders = root.items.orEmpty().filter { it.type == BaseItemKind.COLLECTION_FOLDER }
        }
        val libraries = folders.map { folder ->
            val latest by client.libraryApi.getLatestMedia(
                userId = userId,
                parentId = folder.id,
                limit = 16,
                fields = itemFields,
            )
            LibraryRow(
                id = folder.id.toString(),
                name = folder.name ?: "Library",
                items = latest.map { mapItem(it) },
            )
        }
        return HomeModel(
            resume = resume.items.orEmpty().map { mapItem(it) },
            nextUp = next.items.orEmpty().map { mapItem(it) },
            libraries = libraries,
        )
    }

    override suspend fun loadItem(id: String): CatalogItem {
        val (client, acc) = requireApi()
        val item by client.libraryApi.getItem(
            itemId = UUID.fromString(id),
            userId = UUID.fromString(acc.userId),
        )
        return mapItem(item)
    }

    override suspend fun loadSeasons(seriesId: String): List<SeasonLite> {
        val (client, acc) = requireApi()
        val seasons by client.showApi.getSeasons(
            seriesId = UUID.fromString(seriesId),
            userId = UUID.fromString(acc.userId),
            fields = itemFields,
        )
        return seasons.items.orEmpty().map {
            SeasonLite(
                id = it.id.toString(),
                name = it.name ?: "Season",
                indexNumber = it.indexNumber,
                episodeCount = it.childCount,
                imageTag = it.imageTags?.get(ImageType.PRIMARY) ?: it.imageTags?.values?.firstOrNull(),
            )
        }
    }

    override suspend fun loadEpisodes(seriesId: String, seasonId: String): List<CatalogItem> {
        val (client, acc) = requireApi()
        val episodes by client.showApi.getEpisodes(
            seriesId = UUID.fromString(seriesId),
            userId = UUID.fromString(acc.userId),
            seasonId = UUID.fromString(seasonId),
            fields = itemFields,
        )
        return episodes.items.orEmpty().map { mapItem(it) }
    }

    override suspend fun openPlayback(
        itemId: String,
        table: CapabilityTable,
        audioStreamIndex: Int?,
        subtitleStreamIndex: Int?,
        mediaSourceId: String?,
        startPositionTicks: Long?,
    ): PlaybackOpen {
        val (client, acc) = requireApi()
        val item = loadItem(itemId)
        val profile = toSdkProfile(buildDeviceProfile(table))
        val dto = PlaybackInfoDto(
            userId = UUID.fromString(acc.userId),
            deviceProfile = profile,
            autoOpenLiveStream = true,
            enableDirectPlay = true,
            enableDirectStream = true,
            enableTranscoding = true,
            audioStreamIndex = audioStreamIndex,
            subtitleStreamIndex = subtitleStreamIndex,
            mediaSourceId = mediaSourceId,
            startTimeTicks = startPositionTicks,
        )
        val info by client.mediaInfoApi.getPostedPlaybackInfo(
            itemId = UUID.fromString(itemId),
            data = dto,
        )
        val source = info.mediaSources?.firstOrNull() ?: error("No media source")
        val playSessionId = info.playSessionId ?: randomId()
        val sourceId = source.id ?: itemId
        val token = acc.token
        val path = when {
            source.supportsDirectPlay ->
                "/Videos/$itemId/stream?static=true&mediaSourceId=${enc(sourceId)}&playSessionId=${enc(playSessionId)}"
            !source.transcodingUrl.isNullOrBlank() -> source.transcodingUrl
            else ->
                "/Videos/$itemId/stream?static=true&mediaSourceId=${enc(sourceId)}"
        } ?: error("No playback URL")
        val url = if (path.startsWith("http")) appendKey(path, token) else appendKey("${acc.address}$path", token)
        return PlaybackOpen(
            url = url,
            playSessionId = playSessionId,
            mediaSourceId = sourceId,
            item = item.copy(
                mediaStreams = source.mediaStreams.orEmpty().map { mapStream(it) }.ifEmpty { item.mediaStreams },
                container = source.container ?: item.container,
            ),
        )
    }

    override suspend fun reportPlaying(
        itemId: String,
        mediaSourceId: String,
        playSessionId: String,
        positionSeconds: Double,
        audioStreamIndex: Int?,
        subtitleStreamIndex: Int?,
        playMethod: PlayMethod,
        event: ProgressEvent,
    ) {
        val (client, _) = requireApi()
        val method = when (playMethod) {
            PlayMethod.DIRECT_PLAY -> JfPlayMethod.DIRECT_PLAY
            PlayMethod.DIRECT_STREAM -> JfPlayMethod.DIRECT_STREAM
            PlayMethod.TRANSCODE -> JfPlayMethod.TRANSCODE
        }
        val ticks = secondsToTicks(positionSeconds)
        val itemUuid = UUID.fromString(itemId)
        when (event) {
            ProgressEvent.START -> client.sessionApi.reportPlaybackStart(
                PlaybackStartInfo(
                    canSeek = true,
                    itemId = itemUuid,
                    mediaSourceId = mediaSourceId,
                    playSessionId = playSessionId,
                    positionTicks = ticks,
                    audioStreamIndex = audioStreamIndex,
                    subtitleStreamIndex = subtitleStreamIndex,
                    isPaused = false,
                    isMuted = false,
                    playMethod = method,
                    repeatMode = RepeatMode.REPEAT_NONE,
                    playbackOrder = PlaybackOrder.DEFAULT,
                ),
            )
            ProgressEvent.STOP -> client.sessionApi.reportPlaybackStopped(
                PlaybackStopInfo(
                    itemId = itemUuid,
                    mediaSourceId = mediaSourceId,
                    playSessionId = playSessionId,
                    positionTicks = ticks,
                    failed = false,
                ),
            )
            ProgressEvent.PROGRESS, ProgressEvent.PAUSE -> client.sessionApi.reportPlaybackProgress(
                PlaybackProgressInfo(
                    canSeek = true,
                    itemId = itemUuid,
                    mediaSourceId = mediaSourceId,
                    playSessionId = playSessionId,
                    positionTicks = ticks,
                    audioStreamIndex = audioStreamIndex,
                    subtitleStreamIndex = subtitleStreamIndex,
                    isPaused = event == ProgressEvent.PAUSE,
                    isMuted = false,
                    playMethod = method,
                    repeatMode = RepeatMode.REPEAT_NONE,
                    playbackOrder = PlaybackOrder.DEFAULT,
                ),
            )
        }
    }

    override fun imageUrl(
        itemId: String,
        tag: String?,
        type: String,
        width: Int,
        height: Int,
    ): String? {
        val acc = account ?: return null
        val params = mutableListOf(
            "fillWidth=$width",
            "fillHeight=$height",
            "quality=85",
            "api_key=${acc.token}",
        )
        if (!tag.isNullOrBlank()) params += "tag=$tag"
        return "${acc.address}/Items/$itemId/Images/$type?${params.joinToString("&")}"
    }

    private fun mapItem(item: BaseItemDto): CatalogItem {
        val imageTag = item.imageTags?.get(ImageType.PRIMARY) ?: item.imageTags?.values?.firstOrNull()
        return CatalogItem(
            id = item.id.toString(),
            name = item.name.orEmpty(),
            type = item.type.serialName,
            overview = item.overview,
            year = item.productionYear,
            runtimeTicks = item.runTimeTicks,
            officialRating = item.officialRating,
            communityRating = item.communityRating?.toDouble(),
            genres = item.genres.orEmpty(),
            seriesName = item.seriesName,
            seriesId = item.seriesId?.toString(),
            seasonName = item.seasonName,
            seasonId = item.seasonId?.toString(),
            indexNumber = item.indexNumber,
            parentIndexNumber = item.parentIndexNumber,
            imageTag = imageTag,
            backdropTag = item.backdropImageTags?.firstOrNull(),
            container = item.container,
            mediaStreams = item.mediaStreams.orEmpty().map { mapStream(it) },
            mediaSources = item.mediaSources.orEmpty().map { src ->
                MediaSourceLite(
                    id = src.id.orEmpty(),
                    name = src.name ?: src.container ?: "Version",
                    container = src.container,
                    path = src.path,
                    bitrate = src.bitrate,
                    streams = src.mediaStreams.orEmpty().map { mapStream(it) },
                )
            },
            people = item.people.orEmpty().take(8).map {
                PersonLite(
                    name = it.name.orEmpty(),
                    role = it.role ?: it.type?.toString().orEmpty(),
                    imageTag = it.primaryImageTag,
                    id = it.id?.toString(),
                )
            },
            userData = UserDataLite(
                positionTicks = item.userData?.playbackPositionTicks,
                played = item.userData?.played == true,
            ),
            childCount = item.childCount,
        )
    }

    private fun mapStream(s: org.jellyfin.sdk.model.api.MediaStream) = MediaStreamLite(
        index = s.index,
        type = s.type.serialName,
        codec = s.codec,
        language = s.language,
        displayTitle = s.displayTitle,
        channels = s.channels,
        isDefault = s.isDefault,
        isForced = s.isForced,
        videoRangeType = s.videoRangeType?.serialName,
        profile = s.profile,
        width = s.width,
        height = s.height,
        bitDepth = s.bitDepth,
        videoRange = s.videoRange?.serialName,
    )

    private fun appendKey(url: String, token: String): String {
        val sep = if (url.contains('?')) "&" else "?"
        return if (url.contains("api_key=")) url else "$url${sep}api_key=$token"
    }

    private fun enc(value: String): String = java.net.URLEncoder.encode(value, Charsets.UTF_8.name())

    private fun toSdkProfile(src: CinefinDeviceProfile): DeviceProfile = DeviceProfile(
        name = src.name,
        maxStreamingBitrate = src.maxStreamingBitrate,
        maxStaticBitrate = src.maxStaticBitrate,
        musicStreamingTranscodingBitrate = src.musicStreamingTranscodingBitrate,
        directPlayProfiles = src.directPlayProfiles.map {
            DirectPlayProfile(
                container = it.container,
                audioCodec = it.audioCodec,
                videoCodec = it.videoCodec,
                type = DlnaProfileType.VIDEO,
            )
        },
        transcodingProfiles = src.transcodingProfiles.map {
            TranscodingProfile(
                container = it.container,
                type = DlnaProfileType.VIDEO,
                videoCodec = it.videoCodec,
                audioCodec = it.audioCodec,
                protocol = MediaStreamProtocol.HTTP,
                estimateContentLength = it.estimateContentLength,
                copyTimestamps = it.copyTimestamps,
                context = EncodingContext.STREAMING,
                enableSubtitlesInManifest = false,
                conditions = emptyList(),
            )
        },
        containerProfiles = src.containerProfiles.map { slot ->
            ContainerProfile(
                type = DlnaProfileType.VIDEO,
                conditions = slot.conditions.map { cond -> mapCondition(cond) },
                container = slot.container,
            )
        },
        codecProfiles = src.codecProfiles.map { slot ->
            CodecProfile(
                type = if (slot.type.equals("Audio", true)) CodecType.AUDIO else CodecType.VIDEO,
                conditions = slot.conditions.map { cond -> mapCondition(cond) },
                applyConditions = emptyList(),
                codec = slot.codec,
            )
        },
        subtitleProfiles = src.subtitleProfiles.map {
            SubtitleProfile(
                format = it.format,
                method = when (it.method) {
                    "Embed" -> SubtitleDeliveryMethod.EMBED
                    "Encode" -> SubtitleDeliveryMethod.ENCODE
                    else -> SubtitleDeliveryMethod.EXTERNAL
                },
            )
        },
    )

    private fun mapCondition(cond: com.cinefin.tv.core.ProfileCondition): ProfileCondition =
        ProfileCondition(
            condition = when (cond.condition) {
                "Equals" -> ProfileConditionType.EQUALS
                "LessThanEqual" -> ProfileConditionType.LESS_THAN_EQUAL
                "EqualsAny" -> ProfileConditionType.EQUALS_ANY
                else -> ProfileConditionType.NOT_EQUALS
            },
            property = when (cond.property) {
                "VideoRangeType" -> ProfileConditionValue.VIDEO_RANGE_TYPE
                "VideoProfile" -> ProfileConditionValue.VIDEO_PROFILE
                else -> runCatching {
                    ProfileConditionValue.valueOf(
                        cond.property.replace(Regex("([a-z])([A-Z])"), "$1_$2").uppercase(),
                    )
                }.getOrElse { ProfileConditionValue.VIDEO_PROFILE }
            },
            value = cond.value,
            isRequired = cond.isRequired,
        )
}
