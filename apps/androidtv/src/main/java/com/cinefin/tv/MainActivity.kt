package com.cinefin.tv

import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinefin.tv.core.confirmedConvertLabel
import com.cinefin.tv.ui.CinefinViewModel
import com.cinefin.tv.ui.Screen
import com.cinefin.tv.ui.screens.ConnectScreen
import com.cinefin.tv.ui.screens.DetailsScreen
import com.cinefin.tv.ui.screens.HomeScreen
import com.cinefin.tv.ui.screens.PasswordScreen
import com.cinefin.tv.ui.screens.PlayerScreen
import com.cinefin.tv.ui.screens.QuickConnectScreen
import com.cinefin.tv.ui.screens.SettingsScreen
import com.cinefin.tv.ui.screens.WizardDetect
import com.cinefin.tv.ui.screens.WizardSummary
import com.cinefin.tv.ui.screens.WizardTest
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.CinefinTheme

class MainActivity : ComponentActivity() {
    private val model: CinefinViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContent {
            CinefinTheme {
                Box(Modifier.fillMaxSize().background(CinefinColors.Bg)) {
                    CinefinRoot(model)
                }
            }
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // D-pad / Back stay with Compose focus. Do not require a touchscreen.
        return super.onKeyDown(keyCode, event)
    }
}

@Composable
fun CinefinRoot(model: CinefinViewModel) {
    val state by model.state.collectAsStateWithLifecycle()
    if (!state.ready) return
    val serverLabel = state.picked?.let {
        "${it.name} · ${it.address.removePrefix("http://").removePrefix("https://")}"
    } ?: "Cinefin"
    when (state.screen) {
        Screen.CONNECT -> ConnectScreen(
            servers = state.servers,
            discovering = state.discovering,
            address = state.address,
            onAddress = model::setAddress,
            onConnect = model::connectManual,
            onPick = model::pickServer,
            onSearchAgain = model::discover,
            error = state.error,
        )
        Screen.QUICK -> QuickConnectScreen(
            serverLabel = serverLabel,
            code = state.qcCode,
            remaining = state.qcRemaining,
            onPassword = { model.go(Screen.PASSWORD) },
            onChangeServer = { model.go(Screen.CONNECT) },
        )
        Screen.PASSWORD -> PasswordScreen(
            serverLabel = serverLabel,
            users = state.users,
            selected = state.selectedUserId,
            onSelectUser = model::setUser,
            username = state.username,
            onUsername = model::setUsername,
            password = state.password,
            onPassword = model::setPassword,
            onSignIn = model::signInPassword,
            onQuick = { model.startQuickConnect() },
            error = state.error,
        )
        Screen.HOME -> HomeScreen(
            home = state.home,
            hero = state.hero,
            onHero = model::setHero,
            onOpen = model::openItem,
            onSettings = { model.go(Screen.SETTINGS) },
            imageUrl = { item, portrait ->
                model.imageUrl(item.id, item.imageTag, "Primary", if (portrait) 240 else 400, if (portrait) 360 else 225)
            },
        )
        Screen.DETAILS -> DetailsScreen(
            item = state.item,
            seasons = state.seasons,
            episodes = state.episodes,
            selectedSeasonId = state.selectedSeasonId,
            audioIndex = state.audioIndex,
            subtitleIndex = state.subtitleIndex,
            sourceId = state.sourceId,
            picker = state.picker,
            convertLabel = confirmedConvertLabel(state.table),
            onPlay = { model.play(false) },
            onPlayFromStart = { model.play(true) },
            onPicker = model::setPicker,
            onAudio = model::setAudio,
            onSubtitle = model::setSubtitle,
            onSource = model::setSource,
            onSeason = model::selectSeason,
            onOpenEpisode = model::openItem,
            onSettings = { model.go(Screen.SETTINGS) },
            backdropUrl = model.imageUrl(state.item.id, state.item.backdropTag, "Backdrop", 1920, 1080),
        )
        Screen.PLAYER -> PlayerScreen(
            item = state.item,
            playUrl = state.playUrl,
            startAt = state.startAt,
            decision = state.decision,
            passthrough = state.decision?.passthroughAudio != false,
            matchFrameRate = state.matchFrameRate,
            audioLabel = state.item.mediaStreams.find {
                it.type.equals("Audio", true) && (state.audioIndex == null || it.index == state.audioIndex)
            }?.displayTitle,
            onBack = model::leavePlayer,
            onProgress = model::report,
        )
        Screen.SETTINGS, Screen.CONVERT -> SettingsScreen(
            table = state.table,
            detected = state.detected,
            matchFrameRate = state.matchFrameRate,
            accountLabel = state.accountLabel,
            onToggle = model::toggleFormat,
            onConvert = model::openConvert,
            onWizard = { model.go(Screen.WIZARD_DETECT) },
            onReprobe = model::reprobe,
            onMatchFrameRate = model::setMatchFrameRate,
            onSignOut = model::signOut,
            onBack = { model.go(if (state.signedIn) Screen.HOME else Screen.CONNECT) },
            convertRowId = if (state.screen == Screen.CONVERT) state.convertRowId else null,
            onPickConvert = { id, auto -> model.setConvert(state.convertRowId ?: return@SettingsScreen, id, auto) },
            onCloseConvert = { model.go(Screen.SETTINGS) },
        )
        Screen.WIZARD_DETECT -> WizardDetect(
            detected = state.detected,
            onContinue = { model.go(Screen.WIZARD_TEST) },
            onSkip = { model.go(if (state.signedIn) Screen.HOME else Screen.SETTINGS) },
        )
        Screen.WIZARD_TEST -> WizardTest(
            onPick = { model.go(Screen.WIZARD_SUMMARY) },
            onBack = { model.go(Screen.WIZARD_DETECT) },
        )
        Screen.WIZARD_SUMMARY -> WizardSummary(
            onFinish = model::finishWizard,
            onAgain = { model.go(Screen.WIZARD_DETECT) },
            onTestDts = { model.go(Screen.WIZARD_TEST) },
        )
    }
}
