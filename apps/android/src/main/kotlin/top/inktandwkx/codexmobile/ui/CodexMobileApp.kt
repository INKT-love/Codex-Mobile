package top.inktandwkx.codexmobile.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Computer
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.ListAlt
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import top.inktandwkx.codexmobile.state.CodexMobileViewModel
import top.inktandwkx.codexmobile.ui.screens.DevicesScreen
import top.inktandwkx.codexmobile.ui.screens.ProjectsScreen
import top.inktandwkx.codexmobile.ui.screens.SettingsScreen
import top.inktandwkx.codexmobile.ui.screens.TaskDetailScreen
import top.inktandwkx.codexmobile.ui.screens.TasksScreen

private data class TopLevelRoute(
    val route: String,
    val label: String,
    val icon: @Composable () -> Unit,
)

private val topLevelRoutes = listOf(
    TopLevelRoute("tasks", "任务", { Icon(Icons.Outlined.ListAlt, contentDescription = null) }),
    TopLevelRoute("devices", "设备", { Icon(Icons.Outlined.Computer, contentDescription = null) }),
    TopLevelRoute("projects", "项目", { Icon(Icons.Outlined.Folder, contentDescription = null) }),
    TopLevelRoute("settings", "设置", { Icon(Icons.Outlined.Settings, contentDescription = null) }),
)

@Composable
fun CodexMobileApp() {
    val navController = rememberNavController()
    val viewModel = viewModel<CodexMobileViewModel>()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar {
                topLevelRoutes.forEach { item ->
                    val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = item.icon,
                        label = { Text(item.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "tasks",
            modifier = Modifier.padding(padding),
        ) {
            composable("tasks") {
                TasksScreen(
                    tasks = uiState.tasks,
                    onOpenTask = { taskId ->
                        viewModel.selectTask(taskId)
                        navController.navigate("taskDetail")
                    },
                )
            }
            composable("taskDetail") {
                TaskDetailScreen(
                    selectedTask = uiState.tasks.firstOrNull { it.id == uiState.selectedTaskId },
                    events = uiState.taskEvents[uiState.selectedTaskId].orEmpty(),
                    projects = uiState.projects,
                    selectedProjectId = uiState.selectedProjectId,
                    prompt = uiState.taskPrompt,
                    permissionLevel = uiState.taskPermissionLevel,
                    taskStatus = uiState.taskStatus,
                    lastError = uiState.lastError,
                    onProjectSelect = viewModel::selectProject,
                    onPromptChange = viewModel::updateTaskPrompt,
                    onPermissionChange = viewModel::updateTaskPermissionLevel,
                    onSend = viewModel::createTask,
                )
            }
            composable("devices") {
                DevicesScreen(
                    devices = uiState.devices,
                    connectionState = uiState.connectionState,
                    pairingCode = uiState.pairingCode,
                    lastError = uiState.lastError,
                    onPairingCodeChange = viewModel::updatePairingCode,
                    onPair = viewModel::pairDevice,
                    onConnect = viewModel::connectAuthenticated,
                    onRefresh = viewModel::refreshDevices,
                )
            }
            composable("projects") {
                ProjectsScreen(
                    projects = uiState.projects,
                    devices = uiState.devices,
                    selectedAgentDeviceId = uiState.selectedAgentDeviceId,
                    newProjectName = uiState.newProjectName,
                    projectStatus = uiState.projectStatus,
                    lastError = uiState.lastError,
                    onSelectAgent = viewModel::selectAgentDevice,
                    onNewProjectNameChange = viewModel::updateNewProjectName,
                    onRefreshProjects = viewModel::refreshProjects,
                    onCreateProject = viewModel::createProject,
                )
            }
            composable("settings") {
                SettingsScreen(
                    serverUrl = uiState.serverUrl,
                    connectionState = uiState.connectionState,
                    lastError = uiState.lastError,
                    onServerUrlChange = viewModel::updateServerUrl,
                    onDisconnect = viewModel::disconnect,
                )
            }
        }
    }
}
