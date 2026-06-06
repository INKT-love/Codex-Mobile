package top.inktandwkx.codexmobile.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val CodexPurple = Color(0xFF5B2ECC)
private val CodexGreen = Color(0xFF15B886)
private val CodexInk = Color(0xFF101114)

private val LightColors: ColorScheme = lightColorScheme(
    primary = CodexPurple,
    secondary = CodexGreen,
    onPrimary = Color.White,
    surface = Color.White,
    onSurface = CodexInk,
    background = Color.White,
    onBackground = CodexInk,
)

@Composable
fun CodexMobileTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        content = content,
    )
}
