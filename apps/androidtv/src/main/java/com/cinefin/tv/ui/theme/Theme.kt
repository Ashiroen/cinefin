package com.cinefin.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

object CinefinColors {
    val Bg = Color(0xFF0B0B0D)
    val Surface = Color(0xFF17171B)
    val Surface2 = Color(0xFF1E1E22)
    val Surface3 = Color(0xFF26262B)
    val Text = Color(0xFFF5F5F6)
    val Muted = Color(0xFF8B8B90)
    val Muted2 = Color(0xFF6A6A70)
    val Amber = Color(0xFFF59E0B)
    val AmberDim = Color(0xFFC2610C)
    val Cream = Color(0xFFF5EBDD)
    val Green = Color(0xFF34D399)
    val Danger = Color(0xFFF87171)
    val Focus = Color(0xFFF59E0B)
}

data class CinefinSafe(val x: Dp, val y: Dp)

val LocalSafe = staticCompositionLocalOf { CinefinSafe(96.dp, 54.dp) }

@Composable
fun CinefinTheme(content: @Composable () -> Unit) {
    val scheme = darkColorScheme(
        primary = CinefinColors.Amber,
        onPrimary = Color(0xFF1A1204),
        secondary = CinefinColors.Cream,
        background = CinefinColors.Bg,
        onBackground = CinefinColors.Text,
        surface = CinefinColors.Surface,
        onSurface = CinefinColors.Text,
        border = CinefinColors.Amber,
    )
    CompositionLocalProvider(LocalSafe provides CinefinSafe(96.dp, 54.dp)) {
        MaterialTheme(colorScheme = scheme, content = content)
    }
}
