package com.cinefin.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.cinefin.tv.core.PublicUser
import com.cinefin.tv.data.fixtureQcCode
import com.cinefin.tv.data.fixtureUsers
import com.cinefin.tv.ui.components.CinefinButton
import com.cinefin.tv.ui.components.CinefinField
import com.cinefin.tv.ui.components.CinefinLogo
import com.cinefin.tv.ui.components.CinefinScreen
import com.cinefin.tv.ui.components.FocusBox
import com.cinefin.tv.ui.components.SectionLabel
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.CinefinTheme
import com.cinefin.tv.ui.theme.LocalSafe

private val ORB = listOf(Color(0xFF6B4A32), Color(0xFF4A3A52), Color(0xFF2F4A36), Color(0xFF2A3A4A), Color(0xFF2A2A2E))

@Composable
fun QuickConnectScreen(
    serverLabel: String,
    code: String,
    remaining: String,
    onPassword: () -> Unit,
    onChangeServer: () -> Unit,
) {
    val safe = LocalSafe.current
    val chars = code.padEnd(6, ' ').take(6).toList()
    CinefinScreen(Modifier.fillMaxSize()) {
        Row(
            Modifier
                .fillMaxSize()
                .padding(horizontal = safe.x, vertical = safe.y),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            CinefinLogo(36.dp)
            Text(serverLabel, color = CinefinColors.Muted, fontSize = 20.sp)
        }
        Column(
            Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Sign in with Quick Connect", color = CinefinColors.Text, fontSize = 56.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(36.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                chars.forEach { c ->
                    Box(
                        Modifier
                            .size(160.dp, 200.dp)
                            .background(CinefinColors.Surface, RoundedCornerShape(22.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (c.isWhitespace()) "·" else c.toString(),
                            color = CinefinColors.Text,
                            fontSize = 96.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
            Spacer(Modifier.height(28.dp))
            Text(
                "On your phone or computer, open Jellyfin › Quick Connect and enter this code.",
                color = CinefinColors.Muted,
                fontSize = 30.sp,
            )
            Spacer(Modifier.height(28.dp))
            Text("Waiting for approval · Code refreshes in $remaining", color = CinefinColors.Muted, fontSize = 24.sp)
            Spacer(Modifier.height(28.dp))
            CinefinButton("Use password instead", onPassword, requestFocus = true)
            Spacer(Modifier.height(12.dp))
            CinefinButton("Change server", onChangeServer, ghost = true)
        }
    }
}

@Composable
fun PasswordScreen(
    serverLabel: String,
    users: List<PublicUser>,
    selected: String,
    onSelectUser: (String) -> Unit,
    username: String,
    onUsername: (String) -> Unit,
    password: String,
    onPassword: (String) -> Unit,
    onSignIn: () -> Unit,
    onQuick: () -> Unit,
    error: String?,
) {
    val safe = LocalSafe.current
    val other = selected == "other" || users.isEmpty()
    val current = users.find { it.id == selected }
    CinefinScreen(Modifier.fillMaxSize()) {
        Row(
            Modifier
                .fillMaxSize()
                .padding(horizontal = safe.x, vertical = safe.y),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            CinefinLogo(36.dp)
            Text(serverLabel, color = CinefinColors.Muted, fontSize = 20.sp)
        }
        Column(
            Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Who's signing in?", color = CinefinColors.Text, fontSize = 56.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(42.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(36.dp)) {
                users.forEachIndexed { i, user ->
                    FocusBox(onClick = { onSelectUser(user.id) }, shape = RoundedCornerShape(20.dp)) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                Modifier
                                    .size(96.dp)
                                    .background(ORB[i % ORB.size], CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(user.name.take(1).uppercase(), color = CinefinColors.Text, fontSize = 36.sp, fontWeight = FontWeight.SemiBold)
                                if (selected == user.id) {
                                    Box(
                                        Modifier
                                            .align(Alignment.BottomEnd)
                                            .size(22.dp)
                                            .background(CinefinColors.Amber, CircleShape),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text("✓", color = Color(0xFF1A1204), fontSize = 12.sp)
                                    }
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            Text(user.name, color = CinefinColors.Text, fontSize = 22.sp)
                        }
                    }
                }
                FocusBox(onClick = { onSelectUser("other") }, shape = RoundedCornerShape(20.dp)) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            Modifier
                                .size(96.dp)
                                .background(Color(0xFF1C1C20), CircleShape)
                                .border(2.dp, Color(0xFF3A3A40), CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("+", color = CinefinColors.Text, fontSize = 36.sp)
                        }
                        Spacer(Modifier.height(12.dp))
                        Text("Other user", color = CinefinColors.Text, fontSize = 22.sp)
                    }
                }
            }
            Spacer(Modifier.height(48.dp))
            Column(Modifier.width(800.dp)) {
                if (other) {
                    SectionLabel("Username")
                    CinefinField(username, onUsername, placeholder = "User name")
                    Spacer(Modifier.height(16.dp))
                }
                SectionLabel("Password for ${if (other) username.ifBlank { "user" } else current?.name ?: "user"}")
                CinefinField(password, onPassword, placeholder = "••••••••", password = true, requestFocus = true)
                Spacer(Modifier.height(16.dp))
                CinefinButton("Sign in", onSignIn, modifier = Modifier.fillMaxSize().height(72.dp))
                if (!error.isNullOrBlank()) {
                    Spacer(Modifier.height(16.dp))
                    Text(error, color = CinefinColors.Danger, fontSize = 22.sp)
                }
            }
            Spacer(Modifier.height(20.dp))
            CinefinButton("Use Quick Connect instead", onQuick, ghost = true)
        }
    }
}

@Preview(device = "id:tv_1080p")
@Composable
fun QuickPreview() {
    CinefinTheme {
        QuickConnectScreen("Home server · 192.168.1.20", fixtureQcCode, "4:32", {}, {})
    }
}

@Preview(device = "id:tv_1080p")
@Composable
fun PasswordPreview() {
    CinefinTheme {
        PasswordScreen(
            "Home server · 192.168.1.20",
            fixtureUsers,
            "v",
            {},
            "",
            {},
            "secret",
            {},
            {},
            {},
            null,
        )
    }
}
