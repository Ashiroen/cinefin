package com.cinefin.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.cinefin.tv.core.DetectedCapabilities
import com.cinefin.tv.ui.components.CinefinButton
import com.cinefin.tv.ui.components.CinefinLogo
import com.cinefin.tv.ui.components.CinefinScreen
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.LocalSafe

@Composable
fun WizardDetect(
    detected: DetectedCapabilities,
    onContinue: () -> Unit,
    onSkip: () -> Unit,
) {
    val safe = LocalSafe.current
    CinefinScreen(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(horizontal = safe.x, vertical = safe.y)) {
            Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    CinefinLogo(34.dp)
                    Text("Receiver setup", color = CinefinColors.Muted, fontSize = 20.sp)
                }
                Text("Step 1 of 3", color = CinefinColors.Muted, fontSize = 20.sp)
            }
        }
        Column(Modifier.fillMaxSize().padding(start = safe.x, top = 160.dp, end = safe.x)) {
            Text("Your TV is connected to your receiver", color = CinefinColors.Text, fontSize = 48.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            Text(
                "Here's what HDMI reported. The next step confirms it on the AVR display.",
                color = CinefinColors.Muted,
                fontSize = 24.sp,
            )
            Spacer(Modifier.height(24.dp))
            InfoCard("✓", "Connected over ${detected.audioOutput ?: "HDMI"}", "${detected.manufacturer.orEmpty()} ${detected.modelName.orEmpty()}")
            Spacer(Modifier.height(12.dp))
            InfoCard("♪", "Reported audio encodings", detected.audioEncodings.joinToString(" · ").ifBlank { "None yet — Shield seed still applies" })
            Spacer(Modifier.height(12.dp))
            InfoCard("▣", "HDR / Dolby Vision", detected.hdrTypes.joinToString(" · ").ifBlank { "Not reported" })
            Spacer(Modifier.height(28.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CinefinButton("Continue", onContinue, requestFocus = true)
                CinefinButton("Skip for now", onSkip, ghost = true)
            }
        }
    }
}

@Composable
fun WizardTest(onPick: (String) -> Unit, onBack: () -> Unit) {
    val safe = LocalSafe.current
    CinefinScreen(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(horizontal = safe.x, vertical = safe.y)) {
            CinefinLogo(34.dp)
            Spacer(Modifier.height(40.dp))
            Text("What does your receiver display now?", color = CinefinColors.Text, fontSize = 48.sp, fontWeight = FontWeight.SemiBold)
            Text("Play a known Atmos / TrueHD title, then pick what the Onkyo showed. M1 uses this as an override — no encoded test tone is bundled.", color = CinefinColors.Muted, fontSize = 22.sp)
            Spacer(Modifier.height(28.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                listOf("TrueHD Atmos", "Dolby Digital Plus", "Dolby Digital", "PCM", "Nothing / stereo").forEachIndexed { i, label ->
                    CinefinButton(label, { onPick(label) }, requestFocus = i == 0)
                }
            }
            Spacer(Modifier.height(20.dp))
            CinefinButton("Back", onBack, ghost = true)
        }
    }
}

@Composable
fun WizardSummary(onFinish: () -> Unit, onAgain: () -> Unit, onTestDts: () -> Unit) {
    val safe = LocalSafe.current
    CinefinScreen(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(horizontal = safe.x, vertical = safe.y)) {
            CinefinLogo(34.dp)
            Spacer(Modifier.height(40.dp))
            Text("Receiver profile saved", color = CinefinColors.Text, fontSize = 48.sp, fontWeight = FontWeight.SemiBold)
            Text("Cinefin will prefer passthrough for every encoding HDMI reports. You can still override each row in Settings.", color = CinefinColors.Muted, fontSize = 22.sp)
            Spacer(Modifier.height(28.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CinefinButton("Finish", onFinish, requestFocus = true)
                CinefinButton("Run again", onAgain)
                CinefinButton("Test DTS conversion", onTestDts, ghost = true)
            }
        }
    }
}

@Composable
private fun InfoCard(glyph: String, title: String, sub: String) {
    Row(
        Modifier
            .width(920.dp)
            .background(CinefinColors.Surface, RoundedCornerShape(28.dp))
            .padding(18.dp, 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Box(Modifier.width(64.dp).height(64.dp).background(CinefinColors.Surface3, CircleShape), contentAlignment = Alignment.Center) {
            Text(glyph, color = CinefinColors.Text, fontSize = 24.sp)
        }
        Column {
            Text(title, color = CinefinColors.Text, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
            Text(sub, color = CinefinColors.Muted, fontSize = 20.sp)
        }
    }
}
