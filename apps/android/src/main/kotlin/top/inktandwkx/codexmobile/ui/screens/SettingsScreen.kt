package top.inktandwkx.codexmobile.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun SettingsScreen(
    serverUrl: String,
    connectionState: String,
    lastError: String?,
    onServerUrlChange: (String) -> Unit,
    onDisconnect: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 24.dp),
    ) {
        Text("设置", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)

        OutlinedTextField(
            value = serverUrl,
            onValueChange = onServerUrlChange,
            label = { Text("服务器地址") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
        )

        Text(
            text = "连接状态：${connectionState.toChineseConnectionState()}",
            modifier = Modifier.padding(top = 16.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (lastError != null) {
            Text(
                text = lastError,
                modifier = Modifier.padding(top = 8.dp),
                color = MaterialTheme.colorScheme.error,
            )
        }

        Button(
            onClick = onDisconnect,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
        ) {
            Text("断开连接")
        }
    }
}

private fun String.toChineseConnectionState(): String = when (this) {
    "Disconnected" -> "未连接"
    "Connecting" -> "连接中"
    "Connected" -> "已连接"
    "Closed" -> "已关闭"
    "Failed" -> "连接失败"
    "Authenticated" -> "已认证"
    else -> this
}
