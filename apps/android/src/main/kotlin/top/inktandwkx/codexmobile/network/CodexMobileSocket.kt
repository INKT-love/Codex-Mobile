package top.inktandwkx.codexmobile.network

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

class CodexMobileSocket(
    private val client: OkHttpClient = OkHttpClient(),
) {
    private var socket: WebSocket? = null

    fun connect(
        serverUrl: String,
        onMessage: (String) -> Unit,
        onState: (SocketState) -> Unit,
    ) {
        val request = Request.Builder()
            .url(serverUrl)
            .build()

        socket = client.newWebSocket(
            request,
            object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    onState(SocketState.Connected)
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    onMessage(text)
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    onState(SocketState.Closed)
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    onState(SocketState.Failed(t.message ?: "WebSocket failed"))
                }
            },
        )
    }

    fun send(text: String): Boolean {
        return socket?.send(text) ?: false
    }

    fun close() {
        socket?.close(1000, "closed")
        socket = null
    }
}

sealed interface SocketState {
    data object Connected : SocketState
    data object Closed : SocketState
    data class Failed(val message: String) : SocketState
}
