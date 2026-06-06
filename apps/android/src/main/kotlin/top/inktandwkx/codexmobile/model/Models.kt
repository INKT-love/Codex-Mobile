package top.inktandwkx.codexmobile.model

enum class DeviceStatus {
    Online,
    Offline,
}

data class DeviceUiModel(
    val id: String,
    val name: String,
    val status: DeviceStatus,
    val capabilities: List<String>,
)

data class ProjectUiModel(
    val id: String,
    val name: String,
    val path: String,
)

enum class TaskStatus {
    Running,
    WaitingApproval,
    Completed,
    Failed,
}

data class TaskUiModel(
    val id: String,
    val title: String,
    val projectName: String,
    val deviceName: String,
    val status: TaskStatus,
    val updatedAt: String,
)

data class TaskEventUiModel(
    val id: String,
    val title: String,
    val body: String,
)
