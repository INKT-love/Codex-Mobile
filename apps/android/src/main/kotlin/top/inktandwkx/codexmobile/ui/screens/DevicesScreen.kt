package top.inktandwkx.codexmobile.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Computer
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import top.inktandwkx.codexmobile.model.DeviceStatus
import top.inktandwkx.codexmobile.model.DeviceUiModel

@Composable
fun DevicesScreen(
    devices: List<DeviceUiModel>,
    connectionState: String,
    pairingCode: String,
    lastError: String?,
    onPairingCodeChange: (String) -> Unit,
    onPair: () -> Unit,
    onConnect: () -> Unit,
    onRefresh: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 24.dp),
    ) {
        Text("设备管理", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)
        Text(
            text = "连接状态：${connectionState.toChineseConnectionState()}",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )
        if (lastError != null) {
            Text(
                text = lastError,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        OutlinedTextField(
            value = pairingCode,
            onValueChange = onPairingCodeChange,
            label = { Text("配对码") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(onClick = onPair, modifier = Modifier.weight(1f)) {
                Text("配对")
            }
            Button(onClick = onConnect, modifier = Modifier.weight(1f)) {
                Text("连接")
            }
            Button(onClick = onRefresh, modifier = Modifier.weight(1f)) {
                Text("刷新")
            }
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.weight(1f)) {
            items(devices) { device ->
                DeviceRow(device)
            }
        }
    }
}

@Composable
private fun DeviceRow(device: DeviceUiModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        tonalElevation = 1.dp,
    ) {
        Row(
            modifier = Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(Icons.Outlined.Computer, contentDescription = null)
            Column(modifier = Modifier.weight(1f)) {
                Text(device.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(
                    device.capabilities.joinToString(" · ") { it.toChineseCapability() },
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = if (device.status == DeviceStatus.Online) "在线" else "离线",
                color = if (device.status == DeviceStatus.Online) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Black,
            )
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

private fun String.toChineseCapability(): String = when (lowercase()) {
    "workspace" -> "工作区"
    "codex" -> "Codex"
    "git" -> "Git"
    else -> this
}
