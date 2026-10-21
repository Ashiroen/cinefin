package com.cinefin.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import com.cinefin.tv.ui.theme.CinefinColors
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun CinefinScreen(modifier: Modifier = Modifier, fill: Boolean = false, content: @Composable () -> Unit) {
    Box(
        modifier
            .background(
                if (fill) {
                    Brush.verticalGradient(listOf(CinefinColors.Bg, CinefinColors.Bg))
                } else {
                    Brush.radialGradient(
                        colors = listOf(Color(0xFF16140F), CinefinColors.Bg),
                    )
                },
            ),
    ) { content() }
}

@Composable
fun rememberCinefinFocus(): Pair<FocusRequester, MutableInteractionSource> {
    val requester = remember { FocusRequester() }
    val source = remember { MutableInteractionSource() }
    return requester to source
}

@Composable
fun CinefinButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    ghost: Boolean = false,
    enabled: Boolean = true,
    requestFocus: Boolean = false,
    content: (@Composable RowScope.() -> Unit)? = null,
) {
    val requester = remember { FocusRequester() }
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    val bg = when {
        focused && !ghost -> CinefinColors.Amber
        ghost -> Color.Transparent
        else -> CinefinColors.Surface
    }
    val fg = if (focused && !ghost) Color(0xFF1A1204) else if (ghost) CinefinColors.Muted else CinefinColors.Text
    Row(
        modifier
            .scale(if (focused) 1.08f else 1f)
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .then(
                if (focused) Modifier.border(4.dp, CinefinColors.Amber, RoundedCornerShape(999.dp))
                else Modifier,
            )
            .focusRequester(requester)
            .focusable(enabled, source)
            .clickable(
                interactionSource = source,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            )
            .onDpadCenter(onClick)
            .defaultMinSize(minHeight = 72.dp)
            .padding(horizontal = 28.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        if (content != null) content() else {
            Text(label, color = fg, fontSize = 26.sp, fontWeight = FontWeight.Medium)
        }
    }
    androidx.compose.runtime.LaunchedEffect(requestFocus) {
        if (requestFocus) requester.requestFocus()
    }
}

@Composable
fun CinefinField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    password: Boolean = false,
    requestFocus: Boolean = false,
    leading: (@Composable () -> Unit)? = null,
) {
    val requester = remember { FocusRequester() }
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    Row(
        modifier
            .scale(if (focused) 1.03f else 1f)
            .clip(RoundedCornerShape(999.dp))
            .background(CinefinColors.Surface)
            .then(if (focused) Modifier.border(4.dp, CinefinColors.Amber, RoundedCornerShape(999.dp)) else Modifier)
            .focusRequester(requester)
            .focusable(true, source)
            .defaultMinSize(minHeight = 92.dp)
            .padding(horizontal = 28.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        leading?.invoke()
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            visualTransformation = if (password) {
                androidx.compose.ui.text.input.PasswordVisualTransformation()
            } else {
                androidx.compose.ui.text.input.VisualTransformation.None
            },
            textStyle = TextStyle(color = CinefinColors.Text, fontSize = 26.sp),
            cursorBrush = SolidColor(CinefinColors.Amber),
            decorationBox = { inner ->
                if (value.isEmpty()) {
                    Text(placeholder, color = CinefinColors.Muted2, fontSize = 26.sp)
                }
                inner()
            },
            modifier = Modifier.weight(1f),
        )
        Text("TV KEYBOARD", color = CinefinColors.Muted, fontSize = 16.sp, fontWeight = FontWeight.Medium)
    }
    androidx.compose.runtime.LaunchedEffect(requestFocus) {
        if (requestFocus) requester.requestFocus()
    }
}

@Composable
fun FocusBox(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    scaleOnFocus: Boolean = true,
    shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(18.dp),
    requestFocus: Boolean = false,
    content: @Composable (focused: Boolean) -> Unit,
) {
    val requester = remember { FocusRequester() }
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    Box(
        modifier
            .scale(if (focused && scaleOnFocus) 1.08f else 1f)
            .then(if (focused) Modifier.border(4.dp, CinefinColors.Amber, shape) else Modifier)
            .focusRequester(requester)
            .focusable(true, source)
            .clickable(
                interactionSource = source,
                indication = null,
                onClick = onClick,
            )
            .onDpadCenter(onClick),
    ) { content(focused) }
    androidx.compose.runtime.LaunchedEffect(requestFocus) {
        if (requestFocus) requester.requestFocus()
    }
}

fun Modifier.onDpadCenter(onClick: () -> Unit): Modifier = onPreviewKeyEvent { event ->
    if (event.type == KeyEventType.KeyUp &&
        (event.key == Key.DirectionCenter || event.key == Key.Enter || event.key == Key.NumPadEnter)
    ) {
        onClick()
        true
    } else {
        false
    }
}

@Composable
fun StatusChip(status: String, kind: String) {
    val (bg, fg) = when (kind) {
        "direct", "sent_to_receiver" -> Color(0xFF163326) to CinefinColors.Green
        "converted" -> Color(0xFF3A2F12) to CinefinColors.Amber
        "repackaged" -> CinefinColors.Surface3 to Color(0xFFC8C8CC)
        else -> Color.Transparent to CinefinColors.Muted
    }
    Box(
        Modifier
            .then(
                if (kind == "untested") Modifier.border(2.dp, CinefinColors.Muted2, RoundedCornerShape(999.dp))
                else Modifier.background(bg, RoundedCornerShape(999.dp)),
            )
            .padding(horizontal = 12.dp, vertical = 4.dp),
    ) {
        Text(status, color = fg, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun CinefinLogo(size: Dp = 42.dp, word: Boolean = true) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        androidx.compose.foundation.Canvas(Modifier.size(size)) {
            val w = this.size.width
            val h = this.size.height
            val g = Brush.linearGradient(
                0f to Color(0xFFFFD27A),
                0.55f to Color(0xFFF59E0B),
                1f to Color(0xFFC2610C),
            )
            val cx = w * 0.5f
            val cy = h * 0.5f
            val outer = w * 0.405f
            val inner = w * 0.275f
            val start = Math.toRadians(38.0)
            val sweep = Math.toRadians(284.0)
            val ring = Path()
            val steps = 48
            for (i in 0..steps) {
                val a = start + sweep * (i / steps.toFloat())
                val x = cx + outer * cos(a).toFloat()
                val y = cy + outer * sin(a).toFloat()
                if (i == 0) ring.moveTo(x, y) else ring.lineTo(x, y)
            }
            for (i in steps downTo 0) {
                val a = start + sweep * (i / steps.toFloat())
                ring.lineTo(cx + inner * cos(a).toFloat(), cy + inner * sin(a).toFloat())
            }
            ring.close()
            drawPath(ring, g, style = Fill)
            val play = Path().apply {
                moveTo(w * 0.43f, h * 0.35f)
                lineTo(w * 0.69f, h * 0.50f)
                lineTo(w * 0.43f, h * 0.65f)
                close()
            }
            drawPath(play, g, style = Fill)
        }
        if (word) {
            Text(
                "cinefin",
                color = Color(0xFFF3ECE3),
                fontSize = (size.value * 0.72f).sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-1).sp,
            )
        }
    }
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        modifier = modifier,
        color = CinefinColors.Muted,
        fontSize = 18.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 2.sp,
    )
}
