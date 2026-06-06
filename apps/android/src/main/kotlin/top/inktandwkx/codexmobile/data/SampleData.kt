package top.inktandwkx.codexmobile.data

import top.inktandwkx.codexmobile.model.DeviceStatus
import top.inktandwkx.codexmobile.model.DeviceUiModel
import top.inktandwkx.codexmobile.model.ProjectUiModel
import top.inktandwkx.codexmobile.model.TaskEventUiModel
import top.inktandwkx.codexmobile.model.TaskStatus
import top.inktandwkx.codexmobile.model.TaskUiModel

object SampleData {
    val devices = listOf(
        DeviceUiModel(
            id = "agent_admin",
            name = "Administrator",
            status = DeviceStatus.Online,
            capabilities = listOf("工作区", "Codex", "Git"),
        ),
    )

    val projects = listOf(
        ProjectUiModel(
            id = "codex_mobile",
            name = "CodexMobile",
            path = "F:\\Coding\\Program\\CodexMobile",
        ),
        ProjectUiModel(
            id = "nonebot",
            name = "nonebot",
            path = "F:\\Coding\\Program\\nonebot",
        ),
    )

    val tasks = listOf(
        TaskUiModel(
            id = "task_1",
            title = "Codex 移动端中继骨架",
            projectName = "CodexMobile",
            deviceName = "Administrator",
            status = TaskStatus.Completed,
            updatedAt = "06月06日 16:20",
        ),
        TaskUiModel(
            id = "task_2",
            title = "项目列表与创建流程",
            projectName = "CodexMobile",
            deviceName = "Administrator",
            status = TaskStatus.Running,
            updatedAt = "06月06日 16:44",
        ),
    )

    val events = listOf(
        TaskEventUiModel(
            id = "event_1",
            title = "任务已开始",
            body = "电脑端 Agent 已接受请求，并打开项目工作区。",
        ),
        TaskEventUiModel(
            id = "event_2",
            title = "Codex 输出",
            body = "Codex 在电脑端运行时，流式输出会显示在这里。",
        ),
        TaskEventUiModel(
            id = "event_3",
            title = "Git",
            body = "Ship 类型项目会在时间线里显示提交和推送结果。",
        ),
    )
}
