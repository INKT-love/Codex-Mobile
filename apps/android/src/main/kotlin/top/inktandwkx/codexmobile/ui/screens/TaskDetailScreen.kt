package top.inktandwkx.codexmobile.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.AssistChip
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import top.inktandwkx.codexmobile.model.ProjectUiModel
import top.inktandwkx.codexmobile.model.TaskEventUiModel
import top.inktandwkx.codexmobile.model.TaskUiModel

@Composable
fun TaskDetailScreen(
    selectedTask: TaskUiModel?,
    events: List<TaskEventUiModel>,
    projects: List<ProjectUiModel>,
    selectedProjectId: String?,
    prompt: String,
    permissionLevel: String,
    taskStatus: String,
    lastError: String?,
    onProjectSelect: (String) -> Unit,
    onPromptChange: (String) -> Unit,
    onPermissionChange: (String) -> Unit,
    onSend: () -> Unit,
) {
    var projectMenuExpanded by remember { mutableStateOf(false) }
    val selectedProject = projects.firstOrNull { it.id == selectedProjectId } ?: projects.firstOrNull()
    val displayEvents = if (events.isEmpty()) {
        listOf(
            TaskEventUiModel(
                id = "empty",
                title = "准备就绪",
                body = "选择项目后输入任务，点击发送即可让电脑端 Codex 执行。",
            ),
        )
    } else {
        events
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 24.dp),
    ) {
        Text(
            text = selectedTask?.title ?: "新建 Codex 任务",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Black,
        )
        Text(
            text = selectedTask?.let { "${it.deviceName} · ${it.projectName} · ${it.status.toChineseStatus()}" }
                ?: "项目：${selectedProject?.name ?: "未选择"} · 权限：${permissionLevel.toChinesePermission()}",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = taskStatus,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )
        if (lastError != null) {
            Text(
                text = lastError,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Surface {
                AssistChip(
                    onClick = { projectMenuExpanded = true },
                    label = { Text("项目：${selectedProject?.name ?: "未选择"}") },
                )
                DropdownMenu(
                    expanded = projectMenuExpanded,
                    onDismissRequest = { projectMenuExpanded = false },
                ) {
                    if (projects.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("请先到项目页刷新项目") },
                            onClick = { projectMenuExpanded = false },
                        )
                    } else {
                        projects.forEach { project ->
                            DropdownMenuItem(
                                text = { Text(project.name) },
                                onClick = {
                                    onProjectSelect(project.id)
                                    projectMenuExpanded = false
                                },
                            )
                        }
                    }
                }
            }

            listOf("Review", "Edit", "Ship").forEach { value ->
                FilterChip(
                    selected = permissionLevel == value,
                    onClick = { onPermissionChange(value) },
                    label = { Text(value.toChinesePermission()) },
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(displayEvents) { event ->
                EventBubble(event)
            }
        }

        Surface(
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding(),
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                TextField(
                    value = prompt,
                    onValueChange = onPromptChange,
                    placeholder = { Text("给 Codex 发送消息...") },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        focusedIndicatorColor = MaterialTheme.colorScheme.surfaceVariant,
                        unfocusedIndicatorColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surface) {
                        IconButton(onClick = {}) {
                            Icon(Icons.Outlined.Add, contentDescription = "添加附件")
                        }
                    }
                    Row {
                        IconButton(onClick = {}) {
                            Icon(Icons.Outlined.Mic, contentDescription = "语音")
                        }
                        IconButton(onClick = onSend) {
                            Icon(Icons.Outlined.Send, contentDescription = "发送")
                        }
                    }
                }
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

private fun top.inktandwkx.codexmobile.model.TaskStatus.toChineseStatus(): String = when (this) {
    top.inktandwkx.codexmobile.model.TaskStatus.Queued -> "排队中"
    top.inktandwkx.codexmobile.model.TaskStatus.Running -> "运行中"
    top.inktandwkx.codexmobile.model.TaskStatus.WaitingApproval -> "待确认"
    top.inktandwkx.codexmobile.model.TaskStatus.Completed -> "已完成"
    top.inktandwkx.codexmobile.model.TaskStatus.Failed -> "失败"
    top.inktandwkx.codexmobile.model.TaskStatus.Cancelled -> "已取消"
}

@Composable
private fun EventBubble(event: TaskEventUiModel) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(event.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(event.body, style = MaterialTheme.typography.bodyLarge)
        }
    }
}
