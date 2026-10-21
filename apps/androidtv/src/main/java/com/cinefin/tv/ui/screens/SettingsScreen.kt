package com.cinefin.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.cinefin.tv.core.CONVERT_TARGETS
import com.cinefin.tv.core.CapabilityTable
import com.cinefin.tv.core.ConvertTargetId
import com.cinefin.tv.core.DetectedCapabilities
import com.cinefin.tv.core.FormatKind
import com.cinefin.tv.core.FormatRow
import com.cinefin.tv.core.FormatStatus
import com.cinefin.tv.core.SHIELD_TV_ONKYO
import com.cinefin.tv.core.cloneTable
import com.cinefin.tv.core.listConfirmedConvertTargets
import com.cinefin.tv.core.resolveConvertTo
import com.cinefin.tv.core.sourceCaption
import com.cinefin.tv.core.statusLabel
import com.cinefin.tv.ui.components.CinefinButton
import com.cinefin.tv.ui.components.CinefinLogo
import com.cinefin.tv.ui.components.CinefinScreen
import com.cinefin.tv.ui.components.FocusBox
import com.cinefin.tv.ui.components.SectionLabel
import com.cinefin.tv.ui.components.StatusChip
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.CinefinTheme
import com.cinefin.tv.ui.theme.LocalSafe

@Composable
fun SettingsScreen(
    table: CapabilityTable,
    detected: DetectedCapabilities,
    matchFrameRate: Boolean,
    accountLabel: String,
    onToggle: (String, FormatStatus) -> Unit,
    onConvert: (String) -> Unit,
    onWizard: () -> Unit,
    onReprobe: () -> Unit,
    onMatchFrameRate: (Boolean) -> Unit,
    onSignOut: () -> Unit,
    onBack: () -> Unit,
    convertRowId: String? = null,
    onPickConvert: ((ConvertTargetId?, Boolean) -> Unit)? = null,
    onCloseConvert: (() -> Unit)? = null,
) {
    val safe = LocalSafe.current
    val audio = table.rows.filter { it.kind == FormatKind.AUDIO }
    val video = table.rows.filter { it.kind == FormatKind.VIDEO }
    val containers = table.rows.filter { it.kind == FormatKind.CONTAINER }
    val counts = listOf(
        table.rows.count { it.status == FormatStatus.DIRECT || it.status == FormatStatus.SENT_TO_RECEIVER },
        table.rows.count { it.status == FormatStatus.REPACKAGED },
        table.rows.count { it.status == FormatStatus.CONVERTED },
        table.rows.count { it.status == FormatStatus.UNTESTED },
    )
    CinefinScreen(Modifier.fillMaxSize(), fill = true) {
        Row(Modifier.fillMaxSize()) {
            Column(
                Modifier
                    .width(440.dp)
                    .fillMaxHeight()
                    .background(androidx.compose.ui.graphics.Color(0xFF0C0C0E))
                    .padding(start = safe.x, top = safe.y, end = 36.dp, bottom = safe.y),
            ) {
                CinefinLogo(34.dp)
                Spacer(Modifier.height(28.dp))
                Text("Settings", color = CinefinColors.Text, fontSize = 48.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(24.dp))
                NavItem("Account", false)
                NavItem("Playback & formats", true)
                NavItem("Receiver setup", false, onWizard)
                CinefinButton("Sign out", onSignOut, ghost = true)
                Spacer(Modifier.weight(1f))
                Text(
                    listOfNotNull(
                        accountLabel.ifBlank { "Cinefin on Android TV" },
                        detected.modelName,
                        detected.audioOutput,
                    ).joinToString("\n"),
                    color = CinefinColors.Muted,
                    fontSize = 18.sp,
                )
            }
            Column(
                Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(start = 48.dp, end = safe.x, top = safe.y, bottom = safe.y)
                    .verticalScroll(rememberScrollState()),
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("What your setup plays", color = CinefinColors.Text, fontSize = 42.sp, fontWeight = FontWeight.SemiBold)
                        Text(
                            "Direct: ${counts[0]} · Repackaged: ${counts[1]} · Converted: ${counts[2]} · Untested: ${counts[3]}",
                            color = CinefinColors.Muted,
                            fontSize = 22.sp,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        CinefinButton("Detect again", onReprobe)
                        CinefinButton("Run receiver test", onWizard)
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text(
                    "Easy AVR setup: the HDMI sink reported ${detected.audioEncodings.joinToString().ifBlank { "nothing yet" }}. " +
                        "HDR: ${detected.hdrTypes.joinToString().ifBlank { "none" }}. " +
                        "FFmpeg software decode: ${if (detected.ffmpegAvailable) "bundled" else "not bundled (passthrough / MediaCodec only)"}.",
                    color = CinefinColors.Muted,
                    fontSize = 20.sp,
                )
                Spacer(Modifier.height(12.dp))
                FocusBox(onClick = { onMatchFrameRate(!matchFrameRate) }, shape = RoundedCornerShape(18.dp)) {
                    Text(
                        "Frame-rate matching: ${if (matchFrameRate) "on" else "off"}  (Surface.setFrameRate)",
                        color = CinefinColors.Text,
                        fontSize = 22.sp,
                        modifier = Modifier.padding(16.dp),
                    )
                }
                FormatSection("Audio", audio, table, onToggle, onConvert)
                FormatSection("Video", video, table, onToggle, onConvert)
                FormatSection("Containers", containers, table, onToggle, onConvert)
                Spacer(Modifier.height(20.dp))
                CinefinButton("Back", onBack)
            }
        }
        if (convertRowId != null && onPickConvert != null) {
            val row = table.rows.find { it.id == convertRowId } ?: table.rows.first()
            ConvertSheet(row, table, onPickConvert, onCloseConvert ?: {})
        }
    }
}

@Composable
private fun NavItem(label: String, active: Boolean, onClick: () -> Unit = {}) {
    FocusBox(onClick = onClick, scaleOnFocus = false, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) { focused ->
        Text(
            label,
            color = if (active || focused) CinefinColors.Text else CinefinColors.Muted,
            fontSize = 24.sp,
            modifier = Modifier
                .fillMaxWidth()
                .background(if (active) CinefinColors.Surface else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(16.dp))
                .padding(horizontal = 20.dp, vertical = 14.dp),
        )
    }
}

@Composable
private fun FormatSection(
    title: String,
    rows: List<FormatRow>,
    table: CapabilityTable,
    onToggle: (String, FormatStatus) -> Unit,
    onConvert: (String) -> Unit,
) {
    Spacer(Modifier.height(28.dp))
    SectionLabel(title)
    rows.forEach { row ->
        FocusBox(
            onClick = {
                if (row.status == FormatStatus.CONVERTED) onConvert(row.id)
                else {
                    val next = if (row.status == FormatStatus.SENT_TO_RECEIVER || row.status == FormatStatus.DIRECT) {
                        FormatStatus.CONVERTED
                    } else {
                        FormatStatus.SENT_TO_RECEIVER
                    }
                    onToggle(row.id, next)
                }
            },
            scaleOnFocus = false,
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth(),
        ) { focused ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(if (focused) CinefinColors.Surface else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(18.dp))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(row.label, color = CinefinColors.Text, fontSize = 24.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(280.dp))
                StatusChip(statusLabel(row.status), row.status.name.lowercase())
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(sourceCaption(row), color = CinefinColors.Muted, fontSize = 20.sp)
                    row.reason?.let { Text(it, color = CinefinColors.Muted, fontSize = 20.sp) }
                }
                if (row.status == FormatStatus.CONVERTED) {
                    val auto = resolveConvertTo(table, row.convertTo, row.autoConvert)
                    Text(
                        if (row.autoConvert) "Best confirmed" else CONVERT_TARGETS.getValue(auto).label,
                        color = CinefinColors.Text,
                        modifier = Modifier
                            .background(CinefinColors.Surface, RoundedCornerShape(999.dp))
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                } else {
                    Text(if (row.status == FormatStatus.CONVERTED) "Off" else "On", color = CinefinColors.Muted, fontSize = 18.sp)
                }
            }
        }
    }
}

@Composable
private fun ConvertSheet(
    row: FormatRow,
    table: CapabilityTable,
    onPick: (ConvertTargetId?, Boolean) -> Unit,
    onClose: () -> Unit,
) {
    val confirmed = listConfirmedConvertTargets(table)
    val current = resolveConvertTo(table, row.convertTo, row.autoConvert)
    Box(Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Color(0xB3000000)), contentAlignment = Alignment.Center) {
        Column(
            Modifier
                .width(720.dp)
                .background(androidx.compose.ui.graphics.Color(0xFF1C1C20), RoundedCornerShape(28.dp))
                .padding(42.dp, 40.dp),
        ) {
            Text("Convert ${row.label} to", color = CinefinColors.Text, fontSize = 36.sp, fontWeight = FontWeight.SemiBold)
            Text("Only formats your receiver test confirmed can be picked.", color = CinefinColors.Muted, fontSize = 20.sp)
            Spacer(Modifier.height(16.dp))
            FocusBox(onClick = { onPick(null, true) }, requestFocus = true, shape = RoundedCornerShape(22.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("✓  Best confirmed", color = CinefinColors.Text, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                    Text("Default · now ${CONVERT_TARGETS.getValue(current).label}", color = CinefinColors.Muted, fontSize = 20.sp)
                }
            }
            ConvertTargetId.entries.forEach { id ->
                val ok = id in confirmed
                FocusBox(
                    onClick = { if (ok) onPick(id, false) },
                    shape = RoundedCornerShape(22.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(CONVERT_TARGETS.getValue(id).label, color = CinefinColors.Text, fontSize = 24.sp)
                        Text(if (ok) "Confirmed" else "Untested · run receiver test", color = CinefinColors.Muted, fontSize = 20.sp)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            CinefinButton("Close", onClose)
        }
    }
}

@Preview(device = "id:tv_1080p", name = "Settings")
@Composable
fun SettingsPreview() {
    CinefinTheme {
        SettingsScreen(
            table = cloneTable(SHIELD_TV_ONKYO),
            detected = DetectedCapabilities(
                modelName = "SHIELD Android TV",
                manufacturer = "NVIDIA",
                audioEncodings = setOf("ac3", "eac3", "truehd", "dts", "dts-hd"),
                hdrTypes = listOf("hdr10", "dolby-vision"),
                audioOutput = "Onkyo · HDMI eARC",
            ),
            matchFrameRate = true,
            accountLabel = "Vojtěch · Home server",
            onToggle = { _, _ -> },
            onConvert = {},
            onWizard = {},
            onReprobe = {},
            onMatchFrameRate = {},
            onSignOut = {},
            onBack = {},
        )
    }
}
