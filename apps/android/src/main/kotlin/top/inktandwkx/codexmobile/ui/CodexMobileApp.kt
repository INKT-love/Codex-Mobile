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
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
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
    TopLevelRoute("tasks", "Tasks", { Icon(Icons.Outlined.ListAlt, contentDescription = null) }),
    TopLevelRoute("devices", "Devices", { Icon(Icons.Outlined.Computer, contentDescription = null) }),
    TopLevelRoute("projects", "Projects", { Icon(Icons.Outlined.Folder, contentDescription = null) }),
    TopLevelRoute("settings", "Settings", { Icon(Icons.Outlined.Settings, contentDescription = null) }),
)

@Composable
fun CodexMobileApp() {
    val navController = rememberNavController()
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
                    onOpenTask = { navController.navigate("taskDetail") },
                )
            }
            composable("taskDetail") {
                TaskDetailScreen()
            }
            composable("devices") {
                DevicesScreen()
            }
            composable("projects") {
                ProjectsScreen()
            }
            composable("settings") {
                SettingsScreen()
            }
        }
    }
}
