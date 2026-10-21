package com.cinefin.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.cinefin.tv.core.MIN_SERVER_VERSION_LABEL
import com.cinefin.tv.core.PublicServer
import com.cinefin.tv.data.fixtureServers
import com.cinefin.tv.ui.components.CinefinButton
import com.cinefin.tv.ui.components.CinefinField
import com.cinefin.tv.ui.components.CinefinLogo
import com.cinefin.tv.ui.components.CinefinScreen
import com.cinefin.tv.ui.components.FocusBox
import com.cinefin.tv.ui.components.SectionLabel
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.CinefinTheme
import com.cinefin.tv.ui.theme.LocalSafe

@Composable
fun ConnectScreen(
    servers: List<PublicServer>,
    discovering: Boolean,
    address: String,
    onAddress: (String) -> Unit,
    onConnect: () -> Unit,
    onPick: (PublicServer) -> Unit,
    onSearchAgain: () -> Unit,
    error: String?,
) {
    val safe = LocalSafe.current
    val empty = !discovering && servers.isEmpty()
    CinefinScreen(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(horizontal = safe.x, vertical = safe.y),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(18.dp))
            CinefinLogo(52.dp)
            Spacer(Modifier.height(28.dp))
            Text(
                "Connect to your Jellyfin server",
                color = CinefinColors.Text,
                fontSize = 56.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(42.dp))
            if (empty) {
                Row(
                    Modifier
                        .width(920.dp)
                        .background(CinefinColors.Surface, RoundedCornerShape(28.dp))
                        .padding(18.dp, 18.dp, 18.dp, 18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("No servers found on your network", color = CinefinColors.Text, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                        Text("Is the server on the same network as the TV?", color = CinefinColors.Muted, fontSize = 22.sp)
                    }
                    CinefinButton("Search again", onSearchAgain)
                }
            } else {
                Column(Modifier.width(920.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    SectionLabel(if (discovering) "Searching your network" else "Servers found on your network")
                    servers.forEachIndexed { index, server ->
                        FocusBox(
                            onClick = { if (server.supported) onPick(server) },
                            requestFocus = index == 0,
                            shape = RoundedCornerShape(28.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .background(CinefinColors.Surface, RoundedCornerShape(28.dp))
                                    .padding(horizontal = 28.dp, vertical = 18.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(if (server.supported) "▣" else "□", color = CinefinColors.Muted, fontSize = 26.sp)
                                Spacer(Modifier.width(22.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(server.name, color = CinefinColors.Text, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        buildString {
                                            append(server.address.removePrefix("http://").removePrefix("https://"))
                                            append(" · Jellyfin ")
                                            append(server.version.ifBlank { "—" })
                                            if (!server.supported) append(" · Needs Jellyfin $MIN_SERVER_VERSION_LABEL+")
                                        },
                                        color = CinefinColors.Muted,
                                        fontSize = 22.sp,
                                    )
                                }
                                if (server.supported) Text("›", color = CinefinColors.Muted, fontSize = 26.sp)
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(36.dp))
            Column(Modifier.width(920.dp)) {
                SectionLabel(if (empty) "Enter your server address" else "Enter address manually")
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    CinefinField(
                        value = address,
                        onValueChange = onAddress,
                        placeholder = "e.g. 192.168.1.20:8096",
                        requestFocus = empty,
                        modifier = Modifier.weight(1f),
                    )
                    CinefinButton("Connect", onConnect)
                }
            }
            if (!error.isNullOrBlank()) {
                Spacer(Modifier.height(16.dp))
                Text(error, color = CinefinColors.Danger, fontSize = 20.sp)
            }
        }
    }
}

@Preview(device = "id:tv_1080p", name = "Sign in")
@Composable
fun ConnectPreview() {
    CinefinTheme {
        Box(Modifier.fillMaxSize().background(CinefinColors.Bg)) {
            ConnectScreen(
                servers = fixtureServers,
                discovering = false,
                address = "192.168.1.20:8096",
                onAddress = {},
                onConnect = {},
                onPick = {},
                onSearchAgain = {},
                error = null,
            )
        }
    }
}
