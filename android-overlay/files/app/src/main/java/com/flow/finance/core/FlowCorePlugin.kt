package com.flow.finance.core

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.flow.finance.core.db.CategoryRepo
import com.flow.finance.core.db.FlowDatabase
import com.flow.finance.core.db.MetaRepo
import com.flow.finance.core.db.RulesRepo
import com.flow.finance.core.db.TransactionRepo
import org.json.JSONArray
import org.json.JSONObject

/**
 * FlowCore — Flow's single native engine.
 *
 * Phase 3 (this version): full SQLite store — profile, settings, categories,
 * merchant rules and transactions live in flow.db on the device. The React
 * store mirrors everything via getSnapshot() and calls mutation methods here.
 *
 * Later phases add: incremental SMS ingestion + parser (Phase 4), the
 * notification listener (Phase 5), full duplicate detection (Phase 6).
 * Everything stays on-device; this plugin never performs network I/O.
 */
@CapacitorPlugin(name = "FlowCore")
class FlowCorePlugin : Plugin() {

    companion object {
        const val ENGINE_VERSION = "2.0.0"
        private const val SMS_PERMISSION_REQUEST = 5017
        private const val SNAPSHOT_LIMIT = 3000
    }

    private lateinit var dbHelper: FlowDatabase
    private lateinit var txns: TransactionRepo
    private lateinit var categories: CategoryRepo
    private lateinit var rules: RulesRepo
    private lateinit var meta: MetaRepo

    override fun load() {
        super.load()
        dbHelper = FlowDatabase.get(context)
        txns = TransactionRepo(dbHelper)
        categories = CategoryRepo(dbHelper)
        rules = RulesRepo(dbHelper)
        meta = MetaRepo(dbHelper)
    }

    // ------------------------------------------------------------------ engine

    @PluginMethod
    fun getEngineInfo(call: PluginCall) {
        val info = JSObject()
        info.put("native", true)
        info.put("platform", "android")
        info.put("version", ENGINE_VERSION)
        call.resolve(info)
    }

    // ------------------------------------------------------------ permissions

    @PluginMethod
    fun checkSmsPermission(call: PluginCall) {
        val result = JSObject()
        result.put("granted", hasSmsPermission())
        call.resolve(result)
    }

    @PluginMethod
    fun requestSmsPermission(call: PluginCall) {
        val activity = bridge?.activity
        if (activity == null) {
            call.reject("Activity unavailable")
            return
        }
        if (hasSmsPermission()) {
            val result = JSObject()
            result.put("requested", false)
            result.put("granted", true)
            call.resolve(result)
            return
        }
        activity.requestPermissions(
            arrayOf(Manifest.permission.READ_SMS),
            SMS_PERMISSION_REQUEST
        )
        val result = JSObject()
        result.put("requested", true)
        result.put("granted", false)
        call.resolve(result)
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val activity = bridge?.activity
        if (activity == null) {
            call.reject("Activity unavailable")
            return
        }
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        activity.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun isNotificationListenerEnabled(call: PluginCall) {
        val flat = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        ) ?: ""
        val enabled = flat.split(":").any {
            it.isNotBlank() && context.packageName.equals(
                it.substringBefore('/'),
                ignoreCase = true
            )
        }
        val result = JSObject()
        result.put("enabled", enabled)
        call.resolve(result)
    }

    // ------------------------------------------------------------------ store

    /** Full app state in one call — the React store mirrors this. */
    @PluginMethod
    fun getSnapshot(call: PluginCall) {
        try {
            val snap = JSObject()
            snap.put("profile", meta.getProfile() ?: JSONObject.NULL)
            snap.put("settings", meta.getSettings())
            snap.put("categories", categories.list())
            snap.put("rules", rules.list())
            val list = txns.list(SNAPSHOT_LIMIT)
            snap.put("transactions", list)
            val total = txns.count()
            snap.put("totalTransactions", total)
            snap.put("truncated", total > list.length())
            call.resolve(snap)
        } catch (e: Exception) {
            call.reject("getSnapshot failed: ${e.message}")
        }
    }

    @PluginMethod
    fun saveProfile(call: PluginCall) {
        try {
            val name = call.getString("name")?.trim()
            if (name.isNullOrEmpty()) throw IllegalArgumentException("name required")
            meta.setProfile(name)
            call.resolve()
        } catch (e: Exception) {
            call.reject("saveProfile failed: ${e.message}")
        }
    }

    @PluginMethod
    fun setSettings(call: PluginCall) {
        try {
            val settings = call.data.optJSONObject("settings")
                ?: throw IllegalArgumentException("settings object required")
            meta.setSettings(settings)
            call.resolve()
        } catch (e: Exception) {
            call.reject("setSettings failed: ${e.message}")
        }
    }

    /** mode: "append" (dedup via message hash) or "replaceAll" (demo reset). */
    @PluginMethod
    fun insertTransactions(call: PluginCall) {
        try {
            val arr: JSONArray = call.data.optJSONArray("transactions")
                ?: throw IllegalArgumentException("transactions array required")
            val replaceAll = call.getString("mode") == "replaceAll"
            val inserted = txns.insertAll(arr, replaceAll)
            val result = JSObject()
            result.put("inserted", inserted)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("insertTransactions failed: ${e.message}")
        }
    }

    /** Category correction — stores it for the whole merchant + learns the rule. */
    @PluginMethod
    fun applyCategory(call: PluginCall) {
        try {
            val txnId = call.getString("txnId")
                ?: throw IllegalArgumentException("txnId required")
            val category = call.getString("category")
                ?: throw IllegalArgumentException("category required")
            val merchant = txns.applyCategory(txnId, category)
                ?: throw IllegalArgumentException("transaction not found")
            rules.upsert(merchant.normalized, merchant.display, category)
            call.resolve()
        } catch (e: Exception) {
            call.reject("applyCategory failed: ${e.message}")
        }
    }

    @PluginMethod
    fun addCategory(call: PluginCall) {
        try {
            val name = call.getString("name")?.trim()
                ?: throw IllegalArgumentException("name required")
            val icon = call.getString("icon") ?: "others"
            val color = call.getString("color") ?: "#8B97AC"
            val added = categories.insert(name, icon, color)
            val result = JSObject()
            result.put("added", added)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("addCategory failed: ${e.message}")
        }
    }

    @PluginMethod
    fun updateCategory(call: PluginCall) {
        try {
            val id = call.getString("id") ?: throw IllegalArgumentException("id required")
            categories.update(
                id,
                call.getString("name"),
                call.getString("icon"),
                call.getString("color")
            )
            call.resolve()
        } catch (e: Exception) {
            call.reject("updateCategory failed: ${e.message}")
        }
    }

    @PluginMethod
    fun deleteCategory(call: PluginCall) {
        try {
            val id = call.getString("id") ?: throw IllegalArgumentException("id required")
            categories.delete(id)
            call.resolve()
        } catch (e: Exception) {
            call.reject("deleteCategory failed: ${e.message}")
        }
    }

    @PluginMethod
    fun deleteRule(call: PluginCall) {
        try {
            val id = call.getString("id") ?: throw IllegalArgumentException("id required")
            rules.delete(id)
            call.resolve()
        } catch (e: Exception) {
            call.reject("deleteRule failed: ${e.message}")
        }
    }

    @PluginMethod
    fun clearTestData(call: PluginCall) {
        try {
            val deleted = txns.clearTestData()
            val result = JSObject()
            result.put("deleted", deleted)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("clearTestData failed: ${e.message}")
        }
    }

    private fun hasSmsPermission(): Boolean {
        return context.checkSelfPermission(Manifest.permission.READ_SMS) ==
            PackageManager.PERMISSION_GRANTED
    }
}
