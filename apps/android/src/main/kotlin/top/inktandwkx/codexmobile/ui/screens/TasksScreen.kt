package top.inktandwkx.codexmobile.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddComment
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LargeFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import top.inktandwkx.codexmobile.model.TaskStatus
import top.inktandwkx.codexmobile.model.TaskUiModel

@Composable
fun TasksScreen(
    tasks: List<TaskUiModel>,
    onOpenTask: (String?) -> Unit,
) {
    var selectedFilter by remember { mutableStateOf(TaskFilter.All) }
    val visibleTasks = tasks.filter { selectedFilter.matches(it.status) }

    Scaffold(
        floatingActionButton = {
            LargeFloatingActionButton(onClick = { onOpenTask(null) }) {
                Icon(Icons.Outlined.AddComment, contentDescription = "新建任务")
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp, vertical = 24.dp),
        ) {
            Text(
                text = "全部任务",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Black,
            )

            Spacer(modifier = Modifier.height(24.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TaskFilter.entries.forEach { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter.label) },
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (visibleTasks.isEmpty()) {
                Text(
                    text = "暂无任务。点击右下角按钮创建一个 Codex 任务。",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(visibleTasks) { task ->
                        TaskRow(task = task, onClick = { onOpenTask(task.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun TaskRow(task: TaskUiModel, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .clickable(onClick = onClick),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
    ) {
        Row(
            modifier = Modifier.padding(vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.padding(start = 4.dp),
            ) {
                Icon(
                    imageVector = Icons.Outlined.Code,
                    contentDescription = null,
                    modifier = Modifier.padding(18.dp),
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "${task.deviceName} · ${task.projectName}",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = task.updatedAt,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = task.status.label,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

private val TaskStatus.label: String
    get() = when (this) {
        TaskStatus.Queued -> "排队中"
        TaskStatus.Running -> "运行中"
        TaskStatus.WaitingApproval -> "待确认"
        TaskStatus.Completed -> "已完成"
        TaskStatus.Failed -> "失败"
        TaskStatus.Cancelled -> "已取消"
    }

private enum class TaskFilter(val label: String) {
    All("全部"),
    Running("运行中"),
    WaitingApproval("待确认"),
    Completed("已完成"),
    Failed("失败");

    fun matches(status: TaskStatus): Boolean {
        return when (this) {
            All -> true
            Running -> status == TaskStatus.Queued || status == TaskStatus.Running
            WaitingApproval -> status == TaskStatus.WaitingApproval
            Completed -> status == TaskStatus.Completed
            Failed -> status == TaskStatus.Failed || status == TaskStatus.Cancelled
        }
    }
}
