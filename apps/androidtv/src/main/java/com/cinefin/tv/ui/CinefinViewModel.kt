package com.cinefin.tv.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cinefin.tv.core.CapabilityTable
import com.cinefin.tv.core.CatalogItem
import com.cinefin.tv.core.ConvertTargetId
import com.cinefin.tv.core.DetectedCapabilities
import com.cinefin.tv.core.FormatStatus
import com.cinefin.tv.core.HomeModel
import com.cinefin.tv.core.PlayMethod
import com.cinefin.tv.core.PlaybackDecision
import com.cinefin.tv.core.ProgressEvent
import com.cinefin.tv.core.PublicServer
import com.cinefin.tv.core.PublicUser
import com.cinefin.tv.core.ReceiverOverrides
import com.cinefin.tv.core.SHIELD_TV_ONKYO
import com.cinefin.tv.core.SeasonLite
import com.cinefin.tv.core.StoredAccount
import com.cinefin.tv.core.applyDetection
import com.cinefin.tv.core.applyOverrides
import com.cinefin.tv.core.cloneTable
import com.cinefin.tv.core.decidePlayback
import com.cinefin.tv.core.deviceIdKey
import com.cinefin.tv.core.itemToMedia
import com.cinefin.tv.core.randomId
import com.cinefin.tv.core.ticksToSeconds
import com.cinefin.tv.core.toggleRow
import com.cinefin.tv.data.SessionStore
import com.cinefin.tv.data.fixtureQcCode
import com.cinefin.tv.data.fixtureSeasons
import com.cinefin.tv.data.fixtureServers
import com.cinefin.tv.data.fixtureUsers
import com.cinefin.tv.data.homeFixture
import com.cinefin.tv.data.longMeridian
import com.cinefin.tv.jellyfin.JellyfinServer
import com.cinefin.tv.playback.CapabilityProbe
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class Screen {
    CONNECT, QUICK, PASSWORD, HOME, DETAILS, PLAYER, SETTINGS, CONVERT, WIZARD_DETECT, WIZARD_TEST, WIZARD_SUMMARY
}

data class UiState(
    val screen: Screen = Screen.CONNECT,
    val ready: Boolean = false,
    val address: String = "",
    val servers: List<PublicServer> = emptyList(),
    val discovering: Boolean = false,
    val picked: PublicServer? = null,
    val users: List<PublicUser> = emptyList(),
    val selectedUserId: String = "other",
    val username: String = "",
    val password: String = "",
    val qcCode: String = "",
    val qcRemaining: String = "5:00",
    val home: HomeModel = homeFixture,
    val hero: CatalogItem? = longMeridian,
    val item: CatalogItem = longMeridian,
    val seasons: List<SeasonLite> = emptyList(),
    val episodes: List<CatalogItem> = emptyList(),
    val selectedSeasonId: String? = null,
    val audioIndex: Int? = null,
    val subtitleIndex: Int? = null,
    val sourceId: String? = null,
    val picker: String? = null,
    val table: CapabilityTable = cloneTable(SHIELD_TV_ONKYO),
    val detected: DetectedCapabilities = DetectedCapabilities(),
    val matchFrameRate: Boolean = true,
    val error: String? = null,
    val playUrl: String? = null,
    val startAt: Double = 0.0,
    val decision: PlaybackDecision? = null,
    val convertRowId: String? = null,
    val wizardClip: String = "atmos",
    val dtsChecked: Boolean = false,
    val signedIn: Boolean = false,
    val accountLabel: String = "",
)

class CinefinViewModel(app: Application) : AndroidViewModel(app) {
    private val store = SessionStore(app)
    private var installId = randomId()
    private var server: JellyfinServer? = null
    private var playRef: Triple<String, String, String>? = null
    private var qcJob: Job? = null
    private var overrides = ReceiverOverrides()

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    init {
        viewModelScope.launch { boot() }
    }

    private suspend fun boot() {
        val snap = store.load()
        installId = snap.installId
        server = JellyfinServer(getApplication(), installId)
        val probed = CapabilityProbe.probe(getApplication())
        val table = applyDetection(
            applyOverrides(cloneTable(if (snap.table.rows.isEmpty()) SHIELD_TV_ONKYO else snap.table), snap.overrides),
            probed,
        )
        overrides = snap.overrides
        _state.update {
            it.copy(
                ready = true,
                table = table,
                detected = probed,
                matchFrameRate = snap.matchFrameRate,
            )
        }
        val acc = snap.account
        if (acc != null) {
            server?.bindAccount(acc)
            _state.update {
                it.copy(
                    signedIn = true,
                    accountLabel = "${acc.userName} · ${acc.serverName}",
                    picked = PublicServer(acc.serverId, acc.serverName, acc.address, "", true),
                    screen = Screen.HOME,
                )
            }
            refreshHome()
        } else {
            discover()
        }
    }

    fun discover() {
        val s = server ?: return
        viewModelScope.launch {
            _state.update { it.copy(discovering = true, error = null) }
            val found = runCatching { s.discover() }.getOrDefault(emptyList())
            _state.update { it.copy(servers = found, discovering = false) }
        }
    }

    fun setAddress(value: String) = _state.update { it.copy(address = value) }

    fun connectManual() {
        val s = server ?: return
        viewModelScope.launch {
            _state.update { it.copy(error = null) }
            try {
                val info = s.fetchPublicServer(_state.value.address)
                _state.update { st ->
                    st.copy(
                        picked = info,
                        servers = (st.servers.filter { it.id != info.id } + info),
                    )
                }
                if (!info.supported) return@launch
                afterServer(info)
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message ?: "Could not reach the server") }
            }
        }
    }

    fun pickServer(info: PublicServer) {
        if (!info.supported) return
        _state.update { it.copy(picked = info) }
        viewModelScope.launch { afterServer(info) }
    }

    private suspend fun afterServer(info: PublicServer) {
        val s = server ?: return
        val users = runCatching { s.fetchPublicUsers(info.address) }.getOrDefault(emptyList())
        val qcOn = runCatching { s.isQuickConnectEnabled(info.address) }.getOrDefault(false)
        _state.update {
            it.copy(
                users = users,
                selectedUserId = users.firstOrNull()?.id ?: "other",
                screen = if (qcOn) Screen.QUICK else Screen.PASSWORD,
            )
        }
        if (qcOn) startQuickConnect()
    }

    fun startQuickConnect() {
        val s = server ?: return
        val picked = _state.value.picked ?: return
        qcJob?.cancel()
        qcJob = viewModelScope.launch {
            val started = runCatching { s.startQuickConnect(picked.address) }.getOrNull()
            if (started == null) {
                _state.update { it.copy(qcCode = fixtureQcCode, screen = Screen.QUICK) }
                return@launch
            }
            _state.update { it.copy(qcCode = started.code, screen = Screen.QUICK) }
            val t0 = System.currentTimeMillis()
            while (true) {
                val left = maxOf(0, 300 - ((System.currentTimeMillis() - t0) / 1000).toInt())
                _state.update { it.copy(qcRemaining = "${left / 60}:${(left % 60).toString().padStart(2, '0')}") }
                val ok = runCatching { s.pollQuickConnect(picked.address, started.secret) }.getOrDefault(false)
                if (ok) {
                    val deviceId = randomId()
                    val auth = s.finishQuickConnect(picked.address, started.secret, deviceId)
                    signedIn(picked, auth, deviceId)
                    return@launch
                }
                delay(2000)
            }
        }
    }

    fun signInPassword() {
        val s = server ?: return
        val picked = _state.value.picked ?: return
        val st = _state.value
        val name = (st.users.find { it.id == st.selectedUserId }?.name ?: st.username).trim()
        if (name.isEmpty()) {
            _state.update { it.copy(error = "Enter a user name") }
            return
        }
        viewModelScope.launch {
            try {
                val deviceId = randomId()
                val auth = s.loginByName(picked.address, name, st.password, deviceId)
                signedIn(picked, auth, deviceId)
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message ?: "Sign-in failed") }
            }
        }
    }

    private suspend fun signedIn(
        picked: PublicServer,
        auth: com.cinefin.tv.core.AuthResult,
        deviceId: String,
    ) {
        val unique = deviceIdKey(installId, picked.id, auth.userId).take(32).ifBlank { deviceId }
        val acc = StoredAccount(
            serverId = picked.id,
            serverName = picked.name,
            address = picked.address,
            userId = auth.userId,
            userName = auth.userName,
            token = auth.token,
            deviceId = unique,
        )
        server?.bindAccount(acc)
        store.saveAccount(acc)
        _state.update {
            it.copy(
                signedIn = true,
                accountLabel = "${acc.userName} · ${acc.serverName}",
                password = "",
                screen = Screen.HOME,
                error = null,
            )
        }
        refreshHome()
    }

    private suspend fun refreshHome() {
        val s = server ?: return
        runCatching { s.loadHome() }.onSuccess { home ->
            _state.update {
                it.copy(
                    home = home,
                    hero = home.resume.firstOrNull() ?: home.libraries.firstOrNull()?.items?.firstOrNull(),
                )
            }
        }
    }

    fun openItem(item: CatalogItem) {
        _state.update { it.copy(item = item, hero = item, screen = Screen.DETAILS, picker = null) }
        viewModelScope.launch {
            val s = server ?: return@launch
            val live = runCatching { s.loadItem(item.id) }.getOrDefault(item)
            _state.update { it.copy(item = live) }
            val seriesId = live.seriesId ?: live.id.takeIf { live.type.equals("Series", true) }
            if (seriesId != null && (live.type.equals("Series", true) || live.type.equals("Episode", true) || live.type.equals("Season", true))) {
                val seasons = runCatching { s.loadSeasons(seriesId) }.getOrDefault(fixtureSeasons)
                val seasonId = live.seasonId ?: seasons.firstOrNull()?.id
                val episodes = if (seasonId != null) {
                    runCatching { s.loadEpisodes(seriesId, seasonId) }.getOrDefault(emptyList())
                } else emptyList()
                _state.update { it.copy(seasons = seasons, selectedSeasonId = seasonId, episodes = episodes) }
            } else {
                _state.update { it.copy(seasons = emptyList(), episodes = emptyList()) }
            }
        }
    }

    fun selectSeason(id: String) {
        val item = _state.value.item
        val seriesId = item.seriesId ?: item.id
        _state.update { it.copy(selectedSeasonId = id) }
        viewModelScope.launch {
            val episodes = runCatching { server?.loadEpisodes(seriesId, id) }.getOrNull().orEmpty()
            _state.update { it.copy(episodes = episodes) }
        }
    }

    fun setHero(item: CatalogItem) = _state.update { it.copy(hero = item) }

    fun go(screen: Screen) = _state.update { it.copy(screen = screen, error = null, picker = null) }

    fun setPicker(kind: String?) = _state.update { it.copy(picker = kind) }

    fun setAudio(index: Int) = _state.update { it.copy(audioIndex = index, picker = null) }

    fun setSubtitle(index: Int?) = _state.update { it.copy(subtitleIndex = index, picker = null) }

    fun setSource(id: String) = _state.update { it.copy(sourceId = id, picker = null) }

    fun setUser(id: String) = _state.update { it.copy(selectedUserId = id) }

    fun setUsername(v: String) = _state.update { it.copy(username = v) }

    fun setPassword(v: String) = _state.update { it.copy(password = v) }

    fun play(fromStart: Boolean) {
        val st = _state.value
        val media = itemToMedia(st.item, st.audioIndex, st.subtitleIndex, st.sourceId)
        val dec = media?.let { decidePlayback(it, st.table) }
        val start = if (fromStart) 0.0 else ticksToSeconds(st.item.userData.positionTicks ?: 0)
        _state.update { it.copy(decision = dec, startAt = start) }
        viewModelScope.launch {
            val s = server
            if (s != null && st.signedIn) {
                try {
                    val opened = s.openPlayback(
                        itemId = st.item.id,
                        table = st.table,
                        audioStreamIndex = st.audioIndex,
                        subtitleStreamIndex = st.subtitleIndex,
                        mediaSourceId = st.sourceId,
                        startPositionTicks = if (fromStart) 0 else st.item.userData.positionTicks,
                    )
                    playRef = Triple(st.item.id, opened.mediaSourceId, opened.playSessionId)
                    _state.update {
                        it.copy(
                            playUrl = opened.url,
                            item = opened.item,
                            screen = Screen.PLAYER,
                        )
                    }
                    s.reportPlaying(
                        itemId = st.item.id,
                        mediaSourceId = opened.mediaSourceId,
                        playSessionId = opened.playSessionId,
                        positionSeconds = start,
                        audioStreamIndex = st.audioIndex,
                        subtitleStreamIndex = st.subtitleIndex,
                        playMethod = dec?.playMethod ?: PlayMethod.DIRECT_PLAY,
                        event = ProgressEvent.START,
                    )
                    return@launch
                } catch (e: Exception) {
                    _state.update { it.copy(error = e.message ?: "Playback failed") }
                }
            }
            _state.update { it.copy(screen = Screen.PLAYER) }
        }
    }

    fun report(event: ProgressEvent, position: Double) {
        val ref = playRef ?: return
        val st = _state.value
        viewModelScope.launch {
            runCatching {
                server?.reportPlaying(
                    itemId = ref.first,
                    mediaSourceId = ref.second,
                    playSessionId = ref.third,
                    positionSeconds = position,
                    audioStreamIndex = st.audioIndex,
                    subtitleStreamIndex = st.subtitleIndex,
                    playMethod = st.decision?.playMethod ?: PlayMethod.DIRECT_PLAY,
                    event = event,
                )
            }
        }
    }

    fun leavePlayer(position: Double) {
        report(ProgressEvent.STOP, position)
        playRef = null
        _state.update { it.copy(screen = Screen.DETAILS, playUrl = null) }
    }

    fun toggleFormat(id: String, status: FormatStatus) {
        val next = toggleRow(_state.value.table, id, status)
        persistTable(next)
    }

    fun setConvert(rowId: String, target: ConvertTargetId?, auto: Boolean) {
        val next = _state.value.table.copy(
            rows = _state.value.table.rows.map { row ->
                if (row.id == rowId) row.copy(convertTo = target, autoConvert = auto) else row
            },
        )
        persistTable(next)
        _state.update { it.copy(screen = Screen.SETTINGS, convertRowId = null) }
    }

    fun openConvert(rowId: String) = _state.update { it.copy(screen = Screen.CONVERT, convertRowId = rowId) }

    fun setMatchFrameRate(enabled: Boolean) {
        _state.update { it.copy(matchFrameRate = enabled) }
        viewModelScope.launch { store.saveFrameRateMatch(enabled) }
    }

    fun reprobe() {
        val probed = CapabilityProbe.probe(getApplication())
        val next = applyDetection(_state.value.table, probed)
        persistTable(next)
        _state.update { it.copy(detected = probed) }
    }

    fun finishWizard() {
        val next = applyOverrides(
            cloneTable(SHIELD_TV_ONKYO),
            ReceiverOverrides(
                confirmed = mapOf(
                    "audio.ac3" to FormatStatus.SENT_TO_RECEIVER,
                    "audio.eac3" to FormatStatus.SENT_TO_RECEIVER,
                    "audio.truehd" to FormatStatus.SENT_TO_RECEIVER,
                    "audio.dts" to FormatStatus.SENT_TO_RECEIVER,
                    "audio.dtshd" to FormatStatus.SENT_TO_RECEIVER,
                    "audio.dtsx" to FormatStatus.SENT_TO_RECEIVER,
                ),
            ),
        )
        persistTable(applyDetection(next, _state.value.detected))
        _state.update { it.copy(screen = Screen.HOME) }
    }

    fun signOut() {
        viewModelScope.launch {
            server?.signOut()
            store.saveAccount(null)
            _state.update {
                it.copy(
                    signedIn = false,
                    screen = Screen.CONNECT,
                    accountLabel = "",
                    password = "",
                    playUrl = null,
                )
            }
            discover()
        }
    }

    fun imageUrl(itemId: String, tag: String?, type: String = "Primary", w: Int, h: Int): String? =
        server?.imageUrl(itemId, tag, type, w, h)

    private fun persistTable(table: CapabilityTable) {
        _state.update { it.copy(table = table) }
        viewModelScope.launch { store.saveTable(table, overrides) }
    }
}
