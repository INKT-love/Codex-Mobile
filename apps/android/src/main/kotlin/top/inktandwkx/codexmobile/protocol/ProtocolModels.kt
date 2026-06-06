package top.inktandwkx.codexmobile.protocol

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.time.Instant
import java.util.UUID

private val json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}

@Serializable
data class ProtocolEnvelope(
    val id: String,
    val type: String,
    val version: Int = 1,
    val timestamp: String,
    val source: String,
    val target: String,
    val payload: JsonElement,
)

@Serializable
data class DeviceDto(
    val deviceId: String,
    val deviceName: String,
    val deviceType: String,
    val online: Boolean,
    val capabilities: List<String> = emptyList(),
    val lastSeenAt: String? = null,
)

@Serializable
data class PairingConfirmedPayload(
    val device: DeviceDto,
    val token: String,
)

@Serializable
data class AuthOkPayload(
    val device: DeviceDto,
)

@Serializable
data class DeviceListPayload(
    val devices: List<DeviceDto> = emptyList(),
)

@Serializable
data class ErrorPayload(
    val code: String,
    val message: String,
)

fun parseEnvelope(text: String): ProtocolEnvelope {
    return json.decodeFromString<ProtocolEnvelope>(text)
}

fun parsePairingConfirmed(envelope: ProtocolEnvelope): PairingConfirmedPayload {
    return json.decodeFromJsonElement(PairingConfirmedPayload.serializer(), envelope.payload)
}

fun parseAuthOk(envelope: ProtocolEnvelope): AuthOkPayload {
    return json.decodeFromJsonElement(AuthOkPayload.serializer(), envelope.payload)
}

fun parseDeviceList(envelope: ProtocolEnvelope): DeviceListPayload {
    return json.decodeFromJsonElement(DeviceListPayload.serializer(), envelope.payload)
}

fun parseError(envelope: ProtocolEnvelope): ErrorPayload {
    return json.decodeFromJsonElement(ErrorPayload.serializer(), envelope.payload)
}

fun buildPairingClaimMessage(code: String, deviceName: String): String {
    return buildMessage(
        type = "pairing.claim",
        source = "android",
        payload = buildJsonObject {
            put("code", code)
            put("deviceName", deviceName)
            put("deviceType", "android")
        },
    )
}

fun buildAuthLoginMessage(deviceId: String, token: String): String {
    return buildMessage(
        type = "auth.login",
        source = "android:$deviceId",
        payload = buildJsonObject {
            put("deviceId", deviceId)
            put("token", token)
        },
    )
}

fun buildDeviceListMessage(deviceId: String): String {
    return buildMessage(
        type = "device.list",
        source = "android:$deviceId",
        payload = buildJsonObject {},
    )
}

private fun buildMessage(
    type: String,
    source: String,
    target: String = "server",
    payload: JsonElement,
): String {
    val envelope = ProtocolEnvelope(
        id = "android_${UUID.randomUUID()}",
        type = type,
        timestamp = Instant.now().toString(),
        source = source,
        target = target,
        payload = payload,
    )
    return json.encodeToString(ProtocolEnvelope.serializer(), envelope)
}

fun JsonElement.stringField(name: String): String? {
    return jsonObject[name]?.jsonPrimitive?.content
}
