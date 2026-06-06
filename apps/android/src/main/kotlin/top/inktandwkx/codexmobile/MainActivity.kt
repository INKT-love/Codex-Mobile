package top.inktandwkx.codexmobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import top.inktandwkx.codexmobile.ui.CodexMobileApp
import top.inktandwkx.codexmobile.ui.theme.CodexMobileTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CodexMobileTheme {
                CodexMobileApp()
            }
        }
    }
}
