package com.flow.finance.core.db

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import com.getcapacitor.JSObject
import org.json.JSONObject

/** Profile + app settings (small key/value data). */
class MetaRepo(private val helper: FlowDatabase) {

    fun getProfile(): JSObject? {
        var out: JSObject? = null
        helper.readableDatabase.query(
            "profile", null, "id = ?", arrayOf("1"), null, null, null
        ).use { c ->
            if (c.moveToFirst()) {
                out = JSObject().apply {
                    put("name", c.text("name"))
                    put("createdAt", c.text("created_at"))
                }
            }
        }
        return out
    }

    fun setProfile(name: String) {
        val existing = getProfile()
        val createdAt = existing?.optString("createdAt") ?: Mappers.nowIso()
        val cv = ContentValues()
        cv.put("id", 1)
        cv.put("name", name)
        cv.put("created_at", createdAt)
        helper.writableDatabase.insertWithOnConflict(
            "profile", null, cv, SQLiteDatabase.CONFLICT_REPLACE
        )
    }

    /** Stored settings JSON merged over defaults — never null, always complete. */
    fun getSettings(): JSObject {
        var stored: String? = null
        helper.readableDatabase.query(
            "app_settings", arrayOf("value"), "key = ?", arrayOf("settings"),
            null, null, null
        ).use { c ->
            if (c.moveToFirst()) stored = c.getString(0)
        }
        val json = try {
            stored?.let { JSONObject(it) }
        } catch (e: Exception) {
            null
        }
        val out = JSObject()
        out.put("onboarded", json?.optBoolean("onboarded", false) ?: false)
        out.put("smsGranted", json?.optBoolean("smsGranted", false) ?: false)
        out.put("notificationsEnabled", json?.optBoolean("notificationsEnabled", true) ?: true)
        out.put("appLockEnabled", json?.optBoolean("appLockEnabled", false) ?: false)
        out.put(
            "pinHash",
            if (json != null && json.has("pinHash") && !json.isNull("pinHash"))
                json.optString("pinHash")
            else JSONObject.NULL
        )
        return out
    }

    fun setSettings(settings: JSONObject) {
        val cv = ContentValues()
        cv.put("key", "settings")
        cv.put("value", settings.toString())
        helper.writableDatabase.insertWithOnConflict(
            "app_settings", null, cv, SQLiteDatabase.CONFLICT_REPLACE
        )
    }
}
