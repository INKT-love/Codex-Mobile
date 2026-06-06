package top.inktandwkx.codexmobile.model

enum class DeviceStatus {
    Online,
    Offline,
}

enum class DeviceType {
    Android,
    Agent,
}

data class DeviceUiModel(
    val id: String,
    val name: String,
    val type: DeviceType,
    val status: DeviceStatus,
    val capabilities: List<String>,
)

data class ProjectUiModel(
    val id: String,
    val name: String,
    val path: String,
    val permissionLevel: String = "Edit",
    val gitStatus: String = "unknown",
)

enum class TaskStatus {
    Queued,
    Running,
    WaitingApproval,
    Completed,
    Failed,
    Cancelled,
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
