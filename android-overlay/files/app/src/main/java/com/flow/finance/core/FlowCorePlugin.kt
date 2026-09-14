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
import com.flow.finance.core.db.Mappers
import com.flow.finance.core.db.MetaRepo
import com.flow.finance.core.db.RulesRepo
import com.flow.finance.core.db.TransactionRepo
import com.flow.finance.core.parser.ParserFixtures
import com.flow.finance.core.parser.TransactionParser
import com.flow.finance.core.sms.SmsReader
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * FlowCore — Flow's single native engine.
 *
 * Phase 4 (this version): real SMS ingestion. SmsReader reads the inbox
 * incrementally on-device, TransactionParser converts messages to structured
 * transactions (merchant rules applied, duplicates rejected by message hash),
 * and everything lands in SQLite. Developer Tools gets real SMS test tooling.
 *
 * Later phases: notification listener (5), cross-source dedup (6).
 * This plugin never performs network I/O.
 */
@CapacitorPlugin(name = "FlowCore")
class FlowCorePlugin : Plugin() {

    companion object {
        const val ENGINE_VERSION = "3.0.0"
        private const val SMS_PERMISSION_REQUEST = 5017
        private const val SNAPSHOT_LIMIT = 3000
    }

    private lateinit var dbHelper: FlowDatabase
    private lateinit var txns: TransactionRepo
    private lateinit var categories: CategoryRepo
    private lateinit var rules: RulesRepo
    private lateinit var meta: MetaRepo
    private lateinit var smsReader: SmsReader

    override fun load() {
        super.load()
        dbHelper = FlowDatabase.get(context)
        txns = TransactionRepo(dbHelper)
        categories = CategoryRepo(dbHelper)
        rules = RulesRepo(dbHelper)
        meta = MetaRepo(dbHelper)
        smsReader = SmsReader(context, dbHelper)
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

    // -------------------------------------------------------------- SMS engine

    /** Reads new SMS since the last sync, parses and stores transactions. */
    @PluginMethod
    fun syncSms(call: PluginCall) {
        try {
            if (!hasSmsPermission()) {
                val r = JSObject()
                r.put("permissionGranted", false)
                r.put("scanned", 0)
                r.put("parsed", 0)
                r.put("inserted", 0)
                r.put("duplicates", 0)
                call.resolve(r)
                return
            }
            val stats = smsReader.sync()
            val r = JSObject()
            r.put("permissionGranted", true)
            r.put("scanned", stats.scanned)
            r.put("parsed", stats.parsed)
            r.put("inserted", stats.inserted)
            r.put("duplicates", stats.duplicates)
            call.resolve(r)
        } catch (e: Exception) {
            call.reject("syncSms failed: ${e.message}")
        }
    }

    /**
     * Developer Tools: run the fixture corpus through the REAL parser and
     * insert the results as clearly-flagged test transactions.
     */
    @PluginMethod
    fun generateTestSms(call: PluginCall) {
        try {
            val rulesMap = HashMap<String, String>()
            val arr = rules.list()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                rulesMap[o.optString("merchantNormalized")] = o.optString("category")
            }
            val now = System.currentTimeMillis()
            val out = JSONArray()
            for (f in ParserFixtures.FIXTURES) {
                if (!f.expectParsed) continue
                val ts = now - f.dayOffset * 86400000L
                val p = TransactionParser.parse(f.sender, f.body, ts) ?: continue
                val normalized = Mappers.normalizeMerchant(p.merchant)
                val o = JSONObject()
                o.put("id", UUID.randomUUID().toString())
                o.put("amountMinor", p.amountMinor)
                o.put("currency", "INR")
                o.put("merchant", p.merchant)
                o.put("merchantNormalized", normalized)
                o.put("category", rulesMap[normalized] ?: p.category)
                o.put("type", p.type)
                o.put("source", "test")
                o.put("paymentMethod", p.paymentMethod ?: JSONObject.NULL)
                o.put("accountHint", p.accountHint ?: JSONObject.NULL)
                o.put("transactionDate", p.transactionDate)
                o.put("createdAt", Mappers.nowIso())
                o.put("originalMessage", f.body)
                o.put("messageHash", Mappers.sha256Hex(
                    f.body.uppercase().replace(Regex("\\s+"), " ").trim() +
                        "|" + p.transactionDate.substring(0, 10)
                ))
                o.put("referenceId", p.referenceId ?: JSONObject.NULL)
                o.put("isTestData", true)
                val meta = JSONObject()
                if (p.bank != null) meta.put("bank", p.bank)
                if (f.sender != null) meta.put("sender", f.sender)
                if (meta.length() > 0) o.put("metadata", meta)
                out.put(o)
            }
            val inserted = txns.insertAll(out, false)
            val r = JSObject()
            r.put("inserted", inserted)
            call.resolve(r)
        } catch (e: Exception) {
            call.reject("generateTestSms failed: ${e.message}")
        }
    }

    /** Developer Tools: run the parser fixture suite in-app and report results. */
    @PluginMethod
    fun runParserTests(call: PluginCall) {
        try {
            val outcomes = ParserFixtures.evaluate()
            val failures = JSONArray()
            for (o in outcomes) {
                if (o.reason == null) continue
                val f = JSObject()
                f.put("message", o.fixture.body)
                f.put("reason", o.reason)
                failures.put(f)
            }
            val r = JSObject()
            r.put("total", outcomes.size)
            r.put("passed", outcomes.size - failures.length())
            r.put("failures", failures)
            call.resolve(r)
        } catch (e: Exception) {
            call.reject("runParserTests failed: ${e.message}")
        }
    }

    // ------------------------------------------------------------------ store

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
