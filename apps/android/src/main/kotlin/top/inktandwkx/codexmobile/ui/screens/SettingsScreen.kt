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
        Text("Settings", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)

        OutlinedTextField(
            value = serverUrl,
            onValueChange = onServerUrlChange,
            label = { Text("Server URL") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
        )

        Text(
            text = "Connection: $connectionState",
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
            Text("Disconnect")
        }
    }
}
