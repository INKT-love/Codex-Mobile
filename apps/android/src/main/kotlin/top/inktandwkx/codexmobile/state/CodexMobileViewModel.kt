package top.inktandwkx.codexmobile.state

import androidx.lifecycle.ViewModel
import top.inktandwkx.codexmobile.model.DeviceStatus
import top.inktandwkx.codexmobile.model.DeviceType
import top.inktandwkx.codexmobile.model.DeviceUiModel
import top.inktandwkx.codexmobile.model.ProjectUiModel
import top.inktandwkx.codexmobile.model.TaskEventUiModel
import top.inktandwkx.codexmobile.model.TaskStatus
import top.inktandwkx.codexmobile.model.TaskUiModel
import top.inktandwkx.codexmobile.network.CodexMobileSocket
import top.inktandwkx.codexmobile.network.SocketState
import top.inktandwkx.codexmobile.protocol.DeviceDto
import top.inktandwkx.codexmobile.protocol.ProjectDto
import top.inktandwkx.codexmobile.protocol.TaskDto
import top.inktandwkx.codexmobile.protocol.TaskEventDto
import top.inktandwkx.codexmobile.protocol.buildAuthLoginMessage
import top.inktandwkx.codexmobile.protocol.buildDeviceListMessage
import top.inktandwkx.codexmobile.protocol.buildPairingClaimMessage
import top.inktandwkx.codexmobile.protocol.buildProjectCreateMessage
import top.inktandwkx.codexmobile.protocol.buildProjectListMessage
import top.inktandwkx.codexmobile.protocol.buildTaskCreateMessage
import top.inktandwkx.codexmobile.protocol.parseAuthOk
import top.inktandwkx.codexmobile.protocol.parseDeviceList
import top.inktandwkx.codexmobile.protocol.parseEnvelope
import top.inktandwkx.codexmobile.protocol.parseError
import top.inktandwkx.codexmobile.protocol.parsePairingConfirmed
import top.inktandwkx.codexmobile.protocol.parseProjectCreated
import top.inktandwkx.codexmobile.protocol.parseProjectList
import top.inktandwkx.codexmobile.protocol.parseTaskCreated
import top.inktandwkx.codexmobile.protocol.parseTaskEvent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class CodexMobileUiState(
    val serverUrl: String = "wss://codex.inktandwkx.top:9443/ws",
    val pairingCode: String = "",
    val localDeviceId: String? = null,
    val localDeviceToken: String? = null,
    val connectionState: String = "Disconnected",
    val lastError: String? = null,
    val devices: List<DeviceUiModel> = emptyList(),
    val selectedAgentDeviceId: String? = null,
    val projects: List<ProjectUiModel> = emptyList(),
    val selectedProjectId: String? = null,
    val newProjectName: String = "",
    val projectStatus: String = "未加载",
    val tasks: List<TaskUiModel> = emptyList(),
    val selectedTaskId: String? = null,
    val taskEvents: Map<String, List<TaskEventUiModel>> = emptyMap(),
    val taskPrompt: String = "",
    val taskPermissionLevel: String = "Edit",
    val taskStatus: String = "未发送",
)

private enum class PendingAction {
    None,
    Pair,
    Auth,
}

class CodexMobileViewModel(
    private val socket: CodexMobileSocket = CodexMobileSocket(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(CodexMobileUiState())
    val uiState: StateFlow<CodexMobileUiState> = _uiState.asStateFlow()

    private var pendingAction = PendingAction.None

    fun updateServerUrl(value: String) {
        _uiState.update { it.copy(serverUrl = value) }
    }

    fun updatePairingCode(value: String) {
        _uiState.update { it.copy(pairingCode = value.filter(Char::isDigit).take(6)) }
    }

    fun pairDevice() {
        val code = _uiState.value.pairingCode
        if (code.length < 4) {
            _uiState.update { it.copy(lastError = "请输入有效的配对码。") }
            return
        }

        pendingAction = PendingAction.Pair
        connect()
    }

    fun connectAuthenticated() {
        val state = _uiState.value
        if (state.localDeviceId == null || state.localDeviceToken == null) {
            _uiState.update { it.copy(lastError = "连接前请先配对此手机。") }
            return
        }

        pendingAction = PendingAction.Auth
        connect()
    }

    fun refreshDevices() {
        val deviceId = _uiState.value.localDeviceId ?: return
        socket.send(buildDeviceListMessage(deviceId))
    }

    fun selectAgentDevice(deviceId: String) {
        _uiState.update { it.copy(selectedAgentDeviceId = deviceId) }
        refreshProjects()
    }

    fun updateNewProjectName(value: String) {
        val sanitized = value
            .replace("\\", "")
            .replace("/", "")
            .replace(":", "")
            .replace("*", "")
            .replace("?", "")
            .replace("\"", "")
            .replace("<", "")
            .replace(">", "")
            .replace("|", "")
            .take(80)
        _uiState.update { it.copy(newProjectName = sanitized) }
    }

    fun refreshProjects() {
        val state = _uiState.value
        val deviceId = state.localDeviceId
        val agentDeviceId = state.selectedAgentDeviceId ?: state.firstOnlineAgentDeviceId()

        if (deviceId == null) {
            _uiState.update { it.copy(lastError = "请先在设备页完成手机配对和连接。") }
            return
        }

        if (agentDeviceId == null) {
            _uiState.update { it.copy(projectStatus = "没有在线电脑端 Agent。") }
            return
        }

        _uiState.update {
            it.copy(
                selectedAgentDeviceId = agentDeviceId,
                projectStatus = "正在加载项目...",
                lastError = null,
            )
        }
        socket.send(buildProjectListMessage(deviceId, agentDeviceId))
    }

    fun createProject() {
        val state = _uiState.value
        val deviceId = state.localDeviceId
        val agentDeviceId = state.selectedAgentDeviceId ?: state.firstOnlineAgentDeviceId()
        val folderName = state.newProjectName.trim()

        if (deviceId == null) {
            _uiState.update { it.copy(lastError = "请先在设备页完成手机配对和连接。") }
            return
        }

        if (agentDeviceId == null) {
            _uiState.update { it.copy(projectStatus = "没有在线电脑端 Agent。") }
            return
        }

        if (folderName.isBlank()) {
            _uiState.update { it.copy(lastError = "请输入项目文件夹名称。") }
            return
        }

        _uiState.update {
            it.copy(
                selectedAgentDeviceId = agentDeviceId,
                projectStatus = "正在创建项目...",
                lastError = null,
            )
        }
        socket.send(buildProjectCreateMessage(deviceId, agentDeviceId, folderName))
    }

    fun selectProject(projectId: String) {
        _uiState.update { it.copy(selectedProjectId = projectId) }
    }

    fun selectTask(taskId: String?) {
        _uiState.update { it.copy(selectedTaskId = taskId) }
    }

    fun updateTaskPrompt(value: String) {
        _uiState.update { it.copy(taskPrompt = value.take(8000)) }
    }

    fun updateTaskPermissionLevel(value: String) {
        if (value in setOf("Review", "Edit", "Ship")) {
            _uiState.update { it.copy(taskPermissionLevel = value) }
        }
    }

    fun createTask() {
        val state = _uiState.value
        val deviceId = state.localDeviceId
        val agentDeviceId = state.selectedAgentDeviceId ?: state.firstOnlineAgentDeviceId()
        val project = state.selectedProject()
        val prompt = state.taskPrompt.trim()

        if (deviceId == null) {
            _uiState.update { it.copy(lastError = "请先在设备页完成手机配对和连接。") }
            return
        }

        if (agentDeviceId == null) {
            _uiState.update { it.copy(taskStatus = "没有在线电脑端 Agent。") }
            return
        }

        if (project == null) {
            _uiState.update { it.copy(taskStatus = "请先在项目页刷新并选择项目。") }
            return
        }

        if (prompt.isBlank()) {
            _uiState.update { it.copy(taskStatus = "请输入要让 Codex 执行的任务。") }
            return
        }

        val title = prompt.lineSequence().firstOrNull()?.take(40)?.ifBlank { null } ?: "手机端任务"
        _uiState.update { it.copy(taskStatus = "正在发送任务...", lastError = null) }
        socket.send(
            buildTaskCreateMessage(
                deviceId = deviceId,
                agentDeviceId = agentDeviceId,
                projectId = project.id,
                title = title,
                prompt = prompt,
                permissionLevel = state.taskPermissionLevel,
            ),
        )
    }

    fun disconnect() {
        pendingAction = PendingAction.None
        socket.close()
        _uiState.update { it.copy(connectionState = "Disconnected") }
    }

    private fun connect() {
        val serverUrl = _uiState.value.serverUrl
        _uiState.update { it.copy(connectionState = "Connecting", lastError = null) }

        socket.connect(
            serverUrl = serverUrl,
            onMessage = ::handleMessage,
            onState = ::handleSocketState,
        )
    }

    private fun handleSocketState(state: SocketState) {
        _uiState.update {
            when (state) {
                SocketState.Connected -> it.copy(connectionState = "Connected", lastError = null)
                SocketState.Closed -> it.copy(connectionState = "Closed")
                is SocketState.Failed -> it.copy(connectionState = "Failed", lastError = state.message)
            }
        }
    }

    private fun handleMessage(text: String) {
        val envelope = runCatching { parseEnvelope(text) }.getOrElse { error ->
            _uiState.update { it.copy(lastError = error.message ?: "服务器消息格式无效。") }
            return
        }

        when (envelope.type) {
            "server.welcome" -> handleWelcome()
            "pairing.confirmed" -> handlePairingConfirmed(text)
            "auth.ok" -> handleAuthOk(text)
            "device.list" -> handleDeviceList(text)
            "project.list" -> handleProjectList(text)
            "project.created" -> handleProjectCreated(text)
            "task.created" -> handleTaskCreated(text)
            "task.event" -> handleTaskEvent(text)
            "error" -> handleError(text)
        }
    }

    private fun handleWelcome() {
        when (pendingAction) {
            PendingAction.Pair -> {
                socket.send(
                    buildPairingClaimMessage(
                        code = _uiState.value.pairingCode,
                        deviceName = "安卓手机",
                    ),
                )
            }

            PendingAction.Auth -> {
                val state = _uiState.value
                val deviceId = state.localDeviceId
                val token = state.localDeviceToken
                if (deviceId != null && token != null) {
                    socket.send(buildAuthLoginMessage(deviceId, token))
                }
            }

            PendingAction.None -> Unit
        }
    }

    private fun handlePairingConfirmed(text: String) {
        val payload = parsePairingConfirmed(parseEnvelope(text))
        pendingAction = PendingAction.Auth
        _uiState.update {
            it.copy(
                localDeviceId = payload.device.deviceId,
                localDeviceToken = payload.token,
                pairingCode = "",
                lastError = null,
            )
        }
        socket.send(buildAuthLoginMessage(payload.device.deviceId, payload.token))
    }

    private fun handleAuthOk(text: String) {
        val payload = parseAuthOk(parseEnvelope(text))
        _uiState.update {
            it.copy(
                connectionState = "Authenticated",
                localDeviceId = payload.device.deviceId,
                lastError = null,
            )
        }
        pendingAction = PendingAction.None
        refreshDevices()
    }

    private fun handleDeviceList(text: String) {
        val payload = parseDeviceList(parseEnvelope(text))
        _uiState.update {
            val devices = payload.devices.map(DeviceDto::toUiModel)
            it.copy(
                devices = devices,
                selectedAgentDeviceId = it.selectedAgentDeviceId ?: devices.firstOnlineAgentDeviceId(),
                lastError = null,
            )
        }
    }

    private fun handleProjectList(text: String) {
        val payload = parseProjectList(parseEnvelope(text))
        _uiState.update {
            val projects = payload.projects.map(ProjectDto::toUiModel)
            it.copy(
                selectedAgentDeviceId = payload.agentDeviceId,
                projects = projects,
                selectedProjectId = it.selectedProjectId ?: projects.firstOrNull()?.id,
                projectStatus = if (payload.projects.isEmpty()) "暂无项目，可在下方创建。" else "已加载 ${payload.projects.size} 个项目。",
                lastError = null,
            )
        }
    }

    private fun handleProjectCreated(text: String) {
        val payload = parseProjectCreated(parseEnvelope(text))
        val project = payload.project.toUiModel()
        _uiState.update {
            val projects = listOf(project) + it.projects.filterNot { existing -> existing.id == project.id }
            it.copy(
                projects = projects.sortedBy { value -> value.name.lowercase() },
                selectedProjectId = project.id,
                newProjectName = "",
                projectStatus = "项目已创建：${project.name}",
                lastError = null,
            )
        }
    }

    private fun handleTaskCreated(text: String) {
        val payload = parseTaskCreated(parseEnvelope(text))
        val task = payload.task.toUiModel(_uiState.value)
        val createdEvent = TaskEventUiModel(
            id = "${task.id}_created",
            title = "任务已创建",
            body = "任务已提交到服务器，等待电脑端执行。",
        )
        _uiState.update {
            it.copy(
                tasks = listOf(task) + it.tasks.filterNot { existing -> existing.id == task.id },
                selectedTaskId = task.id,
                taskPrompt = "",
                taskStatus = "任务已创建，等待输出...",
                taskEvents = it.taskEvents + (task.id to listOf(createdEvent)),
                lastError = null,
            )
        }
    }

    private fun handleTaskEvent(text: String) {
        val payload = parseTaskEvent(parseEnvelope(text))
        val event = payload.event.toUiModel()
        _uiState.update {
            val existingEvents = it.taskEvents[payload.event.taskId].orEmpty()
            val tasks = it.tasks.map { task ->
                if (task.id == payload.event.taskId) {
                    task.copy(
                        status = payload.event.statusFromData() ?: task.status,
                        updatedAt = payload.event.createdAt.toDisplayDateTime(),
                    )
                } else {
                    task
                }
            }
            it.copy(
                tasks = tasks,
                selectedTaskId = it.selectedTaskId ?: payload.event.taskId,
                taskStatus = event.title,
                taskEvents = it.taskEvents + (payload.event.taskId to (existingEvents + event)),
                lastError = null,
            )
        }
    }

    private fun handleError(text: String) {
        val payload = parseError(parseEnvelope(text))
        _uiState.update { it.copy(lastError = "${payload.code}: ${payload.message}") }
    }

    override fun onCleared() {
        socket.close()
        super.onCleared()
    }
}

private fun DeviceDto.toUiModel(): DeviceUiModel {
    return DeviceUiModel(
        id = deviceId,
        name = deviceName,
        type = if (deviceType == "agent") DeviceType.Agent else DeviceType.Android,
        status = if (online) DeviceStatus.Online else DeviceStatus.Offline,
        capabilities = capabilities,
    )
}

private fun ProjectDto.toUiModel(): ProjectUiModel {
    return ProjectUiModel(
        id = projectId,
        name = displayName,
        path = absolutePath,
        permissionLevel = permissionLevel,
        gitStatus = gitStatus,
    )
}

private fun TaskDto.toUiModel(state: CodexMobileUiState): TaskUiModel {
    val projectName = state.projects.firstOrNull { it.id == projectId }?.name ?: "未知项目"
    val deviceName = state.devices.firstOrNull { it.id == agentDeviceId }?.name ?: "电脑端"
    return TaskUiModel(
        id = taskId,
        title = title,
        projectName = projectName,
        deviceName = deviceName,
        status = status.toTaskStatus(),
        updatedAt = updatedAt.toDisplayDateTime(),
    )
}

private fun TaskEventDto.toUiModel(): TaskEventUiModel {
    return TaskEventUiModel(
        id = eventId,
        title = kind.toChineseTaskEventKind(),
        body = message.ifBlank { " " },
    )
}

private fun CodexMobileUiState.firstOnlineAgentDeviceId(): String? {
    return devices.firstOnlineAgentDeviceId()
}

private fun CodexMobileUiState.selectedProject(): ProjectUiModel? {
    return projects.firstOrNull { it.id == selectedProjectId } ?: projects.firstOrNull()
}

private fun List<DeviceUiModel>.firstOnlineAgentDeviceId(): String? {
    return firstOrNull { device ->
        device.type == DeviceType.Agent && device.status == DeviceStatus.Online
    }?.id
}

private fun String.toTaskStatus(): TaskStatus = when (this) {
    "queued" -> TaskStatus.Queued
    "running" -> TaskStatus.Running
    "waitingApproval" -> TaskStatus.WaitingApproval
    "completed" -> TaskStatus.Completed
    "failed" -> TaskStatus.Failed
    "cancelled" -> TaskStatus.Cancelled
    else -> TaskStatus.Running
}

private fun String.toDisplayDateTime(): String {
    return runCatching {
        val month = substring(5, 7)
        val day = substring(8, 10)
        val hour = substring(11, 13)
        val minute = substring(14, 16)
        "${month}月${day}日 $hour:$minute"
    }.getOrDefault(this)
}

private fun String.toChineseTaskEventKind(): String = when (this) {
    "output" -> "Codex 输出"
    "status" -> "状态"
    "error" -> "错误"
    "fileSummary" -> "文件摘要"
    "git" -> "Git"
    "approval" -> "权限确认"
    else -> this
}

private fun TaskEventDto.statusFromData(): TaskStatus? {
    val raw = data?.toString() ?: return null
    return when {
        "\"queued\"" in raw -> TaskStatus.Queued
        "\"running\"" in raw -> TaskStatus.Running
        "\"waitingApproval\"" in raw -> TaskStatus.WaitingApproval
        "\"completed\"" in raw -> TaskStatus.Completed
        "\"failed\"" in raw -> TaskStatus.Failed
        "\"cancelled\"" in raw -> TaskStatus.Cancelled
        else -> null
    }
}
