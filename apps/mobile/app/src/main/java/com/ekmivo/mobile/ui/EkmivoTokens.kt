package com.ekmivo.mobile.ui

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * Phase 0: semantic Android tokens copied from docs/design/tokens.css.
 * Canvas/surface/text are the --dashboard-* values. Status colours are
 * --color-success/warning/danger and their matching background roles.
 * These are NOT the reference HTML's placeholder colours.
 */
@Immutable
data class EkmivoPalette(
    val canvas: Color,
    val surface: Color,
    val raised: Color,
    val subtle: Color,
    val border: Color,
    val controlBorder: Color,
    val text: Color,
    val secondary: Color,
    val muted: Color,
    val onPrimary: Color,
    val success: Color,
    val successBackground: Color,
    val warning: Color,
    val warningBackground: Color,
    val danger: Color,
    val dangerBackground: Color
)

object EkmivoTokens {
    val Light = EkmivoPalette(
        canvas = Color(0xFFF4F3EE),
        surface = Color(0xFFFFFFFF),
        raised = Color(0xFFFFFFFF),
        subtle = Color(0xFFECEBE5),
        border = Color(0xFFDDDCD5),
        controlBorder = Color(0xFFBBB9B2),
        text = Color(0xFF1B1B19),
        secondary = Color(0xFF6B6A64),
        muted = Color(0xFF6B6A64),
        onPrimary = Color.White,
        success = Color(0xFF0F7A4B),
        successBackground = Color(0xFFDDF5E8),
        warning = Color(0xFF8A5A00),
        warningBackground = Color(0xFFFBEFD3),
        danger = Color(0xFFB3382C),
        dangerBackground = Color(0xFFFBE0DC)
    )

    val Dark = EkmivoPalette(
        canvas = Color(0xFF0F0F0E),
        surface = Color(0xFF181817),
        raised = Color(0xFF222220),
        subtle = Color(0xFF222220),
        border = Color(0xFF2C2C29),
        controlBorder = Color(0xFF5C5B56),
        text = Color(0xFFF1F0EA),
        secondary = Color(0xFF8D8B84),
        muted = Color(0xFF8D8B84),
        onPrimary = Color.Black,
        success = Color(0xFF3DDC97),
        successBackground = Color(0xFF12301F),
        warning = Color(0xFFF5B544),
        warningBackground = Color(0xFF33260D),
        danger = Color(0xFFF2685B),
        dangerBackground = Color(0xFF3A1B18)
    )

    // Screenshot reference palette for the native app; kept semantic across themes.
    // Exact fixed-size reference geometry. Semantic panel/control/dialog radii
    // are in EkmivoTheme; components retain the reference's own geometry.
    object Measure {
        val screenPadding = 16.dp
        val logo = 34.dp
        val providerMark = 30.dp
        val heroRing = 136.dp
        val heroCore = 112.dp
        val iconTile = 76.dp
        val scannerFrame = 150.dp
        val primaryButtonHeight = 46.dp
        val hairline = 1.dp
    }
}

val LocalEkmivoPalette = staticCompositionLocalOf { EkmivoTokens.Light }
