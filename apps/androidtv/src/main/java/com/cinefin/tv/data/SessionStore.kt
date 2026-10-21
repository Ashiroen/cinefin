package com.cinefin.tv.data

import android.content.Context
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStoreFile
import com.cinefin.tv.core.CapabilityTable
import com.cinefin.tv.core.ConvertTargetId
import com.cinefin.tv.core.FormatKind
import com.cinefin.tv.core.FormatRow
import com.cinefin.tv.core.FormatSource
import com.cinefin.tv.core.FormatStatus
import com.cinefin.tv.core.ReceiverOverrides
import com.cinefin.tv.core.SHIELD_TV_ONKYO
import com.cinefin.tv.core.StoredAccount
import com.cinefin.tv.core.cloneTable
import com.cinefin.tv.core.randomId
import kotlinx.coroutines.flow.first
import org.json.JSONArray
import org.json.JSONObject

class SessionStore(context: Context) {
    private val dataStore = PreferenceDataStoreFactory.create {
        context.applicationContext.preferencesDataStoreFile("cinefin.session")
    }

    suspend fun load(): SessionSnapshot {
        val prefs = dataStore.data.first()
        val installId = prefs[KEY_INSTALL] ?: randomId().also { id ->
            dataStore.edit { it[KEY_INSTALL] = id }
        }
        val account = prefs[KEY_ACCOUNT]?.let { decodeAccount(it) }
        val table = prefs[KEY_TABLE]?.let { decodeTable(it) } ?: cloneTable(SHIELD_TV_ONKYO)
        val overrides = prefs[KEY_OVERRIDES]?.let { decodeOverrides(it) } ?: ReceiverOverrides()
        val matchFrameRate = prefs[KEY_AFR] == "1"
        return SessionSnapshot(installId, account, table, overrides, matchFrameRate)
    }

    suspend fun saveAccount(account: StoredAccount?) {
        dataStore.edit { prefs ->
            if (account == null) prefs.remove(KEY_ACCOUNT) else prefs[KEY_ACCOUNT] = encodeAccount(account)
        }
    }

    suspend fun saveTable(table: CapabilityTable, overrides: ReceiverOverrides) {
        dataStore.edit {
            it[KEY_TABLE] = encodeTable(table)
            it[KEY_OVERRIDES] = encodeOverrides(overrides)
        }
    }

    suspend fun saveFrameRateMatch(enabled: Boolean) {
        dataStore.edit { it[KEY_AFR] = if (enabled) "1" else "0" }
    }

    private fun encodeAccount(a: StoredAccount): String = JSONObject()
        .put("serverId", a.serverId)
        .put("serverName", a.serverName)
        .put("address", a.address)
        .put("userId", a.userId)
        .put("userName", a.userName)
        .put("token", a.token)
        .put("deviceId", a.deviceId)
        .toString()

    private fun decodeAccount(raw: String): StoredAccount? = runCatching {
        val o = JSONObject(raw)
        StoredAccount(
            serverId = o.getString("serverId"),
            serverName = o.getString("serverName"),
            address = o.getString("address"),
            userId = o.getString("userId"),
            userName = o.getString("userName"),
            token = o.getString("token"),
            deviceId = o.getString("deviceId"),
        )
    }.getOrNull()

    private fun encodeTable(table: CapabilityTable): String {
        val rows = JSONArray()
        table.rows.forEach { row ->
            rows.put(
                JSONObject()
                    .put("id", row.id)
                    .put("kind", row.kind.name)
                    .put("label", row.label)
                    .put("status", row.status.name)
                    .put("source", row.source.name)
                    .put("reason", row.reason)
                    .put("convertTo", row.convertTo?.name)
                    .put("autoConvert", row.autoConvert)
                    .put("codecs", JSONArray(row.codecs))
                    .put("detected", row.detected)
                    .put("userOverride", row.userOverride?.name),
            )
        }
        return JSONObject()
            .put("profileId", table.profileId)
            .put("displayName", table.displayName)
            .put("rows", rows)
            .toString()
    }

    private fun decodeTable(raw: String): CapabilityTable? = runCatching {
        val o = JSONObject(raw)
        val rows = o.getJSONArray("rows")
        CapabilityTable(
            profileId = o.getString("profileId"),
            displayName = o.getString("displayName"),
            rows = buildList {
                for (i in 0 until rows.length()) {
                    val r = rows.getJSONObject(i)
                    val codecs = r.optJSONArray("codecs")
                    add(
                        FormatRow(
                            id = r.getString("id"),
                            kind = FormatKind.valueOf(r.getString("kind")),
                            label = r.getString("label"),
                            status = FormatStatus.valueOf(r.getString("status")),
                            source = FormatSource.valueOf(r.getString("source")),
                            reason = r.optString("reason").ifBlank { null },
                            convertTo = r.optString("convertTo").takeIf { it.isNotBlank() }?.let { ConvertTargetId.valueOf(it) },
                            autoConvert = r.optBoolean("autoConvert", true),
                            codecs = buildList {
                                if (codecs != null) for (c in 0 until codecs.length()) add(codecs.getString(c))
                            },
                            detected = if (r.has("detected") && !r.isNull("detected")) r.getBoolean("detected") else null,
                            userOverride = r.optString("userOverride").takeIf { it.isNotBlank() }?.let { FormatStatus.valueOf(it) },
                        ),
                    )
                }
            },
        )
    }.getOrNull()

    private fun encodeOverrides(o: ReceiverOverrides): String {
        val confirmed = JSONObject()
        o.confirmed.forEach { (k, v) -> confirmed.put(k, v.name) }
        val showed = JSONObject()
        o.receiverShowed.forEach { (k, v) -> showed.put(k, v) }
        return JSONObject().put("confirmed", confirmed).put("receiverShowed", showed).toString()
    }

    private fun decodeOverrides(raw: String): ReceiverOverrides = runCatching {
        val o = JSONObject(raw)
        val confirmed = o.optJSONObject("confirmed")
        val showed = o.optJSONObject("receiverShowed")
        ReceiverOverrides(
            confirmed = buildMap {
                confirmed?.keys()?.forEach { put(it, FormatStatus.valueOf(confirmed.getString(it))) }
            },
            receiverShowed = buildMap {
                showed?.keys()?.forEach { put(it, showed.getString(it)) }
            },
        )
    }.getOrDefault(ReceiverOverrides())

    companion object {
        private val KEY_INSTALL = stringPreferencesKey("installId")
        private val KEY_ACCOUNT = stringPreferencesKey("account")
        private val KEY_TABLE = stringPreferencesKey("table")
        private val KEY_OVERRIDES = stringPreferencesKey("overrides")
        private val KEY_AFR = stringPreferencesKey("matchFrameRate")
    }
}

data class SessionSnapshot(
    val installId: String,
    val account: StoredAccount?,
    val table: CapabilityTable,
    val overrides: ReceiverOverrides,
    val matchFrameRate: Boolean,
)
