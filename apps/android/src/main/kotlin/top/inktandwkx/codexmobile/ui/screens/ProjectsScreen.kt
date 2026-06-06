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
import androidx.compose.material.icons.outlined.CreateNewFolder
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import top.inktandwkx.codexmobile.model.DeviceStatus
import top.inktandwkx.codexmobile.model.DeviceType
import top.inktandwkx.codexmobile.model.DeviceUiModel
import top.inktandwkx.codexmobile.model.ProjectUiModel

@Composable
fun ProjectsScreen(
    projects: List<ProjectUiModel>,
    devices: List<DeviceUiModel>,
    selectedAgentDeviceId: String?,
    newProjectName: String,
    projectStatus: String,
    lastError: String?,
    onSelectAgent: (String) -> Unit,
    onNewProjectNameChange: (String) -> Unit,
    onRefreshProjects: () -> Unit,
    onCreateProject: () -> Unit,
) {
    val agents = devices.filter { it.type == DeviceType.Agent }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 24.dp),
    ) {
        Text("项目", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)
        Text(
            text = projectStatus,
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

        if (agents.isEmpty()) {
            Text(
                text = "还没有发现电脑端 Agent。请先到“设备”页配对并连接电脑。",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 16.dp),
            )
        } else {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 16.dp),
            ) {
                agents.forEach { agent ->
                    AssistChip(
                        onClick = { onSelectAgent(agent.id) },
                        label = {
                            val suffix = if (agent.status == DeviceStatus.Online) "在线" else "离线"
                            Text("${agent.name} · $suffix")
                        },
                        enabled = agent.status == DeviceStatus.Online,
                    )
                }
            }
            Text(
                text = "当前电脑：${agents.firstOrNull { it.id == selectedAgentDeviceId }?.name ?: "未选择"}",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        Button(
            onClick = onRefreshProjects,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
        ) {
            Icon(Icons.Outlined.Refresh, contentDescription = null)
            Text("刷新项目列表")
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.weight(1f)) {
            items(projects) { project ->
                ProjectRow(project)
            }
        }

        OutlinedTextField(
            value = newProjectName,
            onValueChange = onNewProjectNameChange,
            label = { Text("新项目文件夹名") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
        )

        Button(onClick = onCreateProject, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Outlined.CreateNewFolder, contentDescription = null)
            Text("创建项目")
        }
    }
}

@Composable
private fun ProjectRow(project: ProjectUiModel) {
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
            Icon(Icons.Outlined.Folder, contentDescription = null)
            Column {
                Text(project.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(project.path, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "权限：${project.permissionLevel.toChinesePermission()} · Git：${project.gitStatus.toChineseGitStatus()}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun String.toChinesePermission(): String = when (this) {
    "Review" -> "只读"
    "Edit" -> "编辑"
    "Ship" -> "自动提交"
    else -> this
}

private fun String.toChineseGitStatus(): String = when (this) {
    "unknown" -> "未知"
    "clean" -> "干净"
    "dirty" -> "有改动"
    "notInitialized" -> "未初始化"
    else -> this
}
