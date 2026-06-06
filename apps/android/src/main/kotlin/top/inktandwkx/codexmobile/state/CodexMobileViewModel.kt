package top.inktandwkx.codexmobile.state

import androidx.lifecycle.ViewModel
import top.inktandwkx.codexmobile.model.DeviceStatus
import top.inktandwkx.codexmobile.model.DeviceUiModel
import top.inktandwkx.codexmobile.network.CodexMobileSocket
import top.inktandwkx.codexmobile.network.SocketState
import top.inktandwkx.codexmobile.protocol.DeviceDto
import top.inktandwkx.codexmobile.protocol.buildAuthLoginMessage
import top.inktandwkx.codexmobile.protocol.buildDeviceListMessage
import top.inktandwkx.codexmobile.protocol.buildPairingClaimMessage
import top.inktandwkx.codexmobile.protocol.parseAuthOk
import top.inktandwkx.codexmobile.protocol.parseDeviceList
import top.inktandwkx.codexmobile.protocol.parseEnvelope
import top.inktandwkx.codexmobile.protocol.parseError
import top.inktandwkx.codexmobile.protocol.parsePairingConfirmed
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
            _uiState.update { it.copy(lastError = "Enter a valid pairing code.") }
            return
        }

        pendingAction = PendingAction.Pair
        connect()
    }

    fun connectAuthenticated() {
        val state = _uiState.value
        if (state.localDeviceId == null || state.localDeviceToken == null) {
            _uiState.update { it.copy(lastError = "Pair this phone before connecting.") }
            return
        }

        pendingAction = PendingAction.Auth
        connect()
    }

    fun refreshDevices() {
        val deviceId = _uiState.value.localDeviceId ?: return
        socket.send(buildDeviceListMessage(deviceId))
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
            _uiState.update { it.copy(lastError = error.message ?: "Invalid server message.") }
            return
        }

        when (envelope.type) {
            "server.welcome" -> handleWelcome()
            "pairing.confirmed" -> handlePairingConfirmed(text)
            "auth.ok" -> handleAuthOk(text)
            "device.list" -> handleDeviceList(text)
            "error" -> handleError(text)
        }
    }

    private fun handleWelcome() {
        when (pendingAction) {
            PendingAction.Pair -> {
                socket.send(
                    buildPairingClaimMessage(
                        code = _uiState.value.pairingCode,
                        deviceName = "Android Phone",
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
            it.copy(
                devices = payload.devices.map(DeviceDto::toUiModel),
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
        status = if (online) DeviceStatus.Online else DeviceStatus.Offline,
        capabilities = capabilities,
    )
}
