package com.flow.finance.core.sms

import android.content.Context
import android.net.Uri
import com.flow.finance.core.db.FlowDatabase
import com.flow.finance.core.db.Mappers
import com.flow.finance.core.db.RulesRepo
import com.flow.finance.core.db.TransactionRepo
import com.flow.finance.core.parser.TransactionParser
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Incremental, on-device SMS reader.
 *
 * First sync covers the last 90 days; after that only messages newer than the
 * last processed timestamp are read — the inbox is never re-scanned wholesale.
 * Duplicate protection: message hash = normalized body + transaction day, and
 * the transactions table enforces UNIQUE on message_hash.
 */
class SmsReader(private val context: Context, dbHelper: FlowDatabase) {

    private val txns = TransactionRepo(dbHelper)
    private val rules = RulesRepo(dbHelper)

    class Stats(val scanned: Int, val parsed: Int, val inserted: Int) {
        val duplicates: Int get() = parsed - inserted
    }

    fun sync(): Stats {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val last = prefs.getLong(KEY_LAST_SYNC, 0L)
        val since = if (last > 0) last else now - FIRST_SYNC_WINDOW_MS

        // Learned merchant rules take priority over dictionary categories.
        val rulesMap = HashMap<String, String>()
        val rulesArr = rules.list()
        for (i in 0 until rulesArr.length()) {
            val o = rulesArr.getJSONObject(i)
            rulesMap[o.optString("merchantNormalized")] = o.optString("category")
        }

        val out = JSONArray()
        var scanned = 0
        var parsed = 0
        var maxDate = since

        try {
            context.contentResolver.query(
                Uri.parse("content://sms/inbox"),
                arrayOf("address", "body", "date"),
                "date > ?",
                arrayOf(since.toString()),
                "date ASC"
            )?.use { c ->
                val iAddr = c.getColumnIndexOrThrow("address")
                val iBody = c.getColumnIndexOrThrow("body")
                val iDate = c.getColumnIndexOrThrow("date")
                while (c.moveToNext() && scanned < MAX_ROWS) {
                    scanned++
                    val dateMs = c.getLong(iDate)
                    if (dateMs > maxDate) maxDate = dateMs
                    val body = c.getString(iBody) ?: continue
                    val sender = if (c.isNull(iAddr)) null else c.getString(iAddr)
                    val p = TransactionParser.parse(sender, body, dateMs) ?: continue
                    parsed++

                    val normalized = Mappers.normalizeMerchant(p.merchant)
                    val normBody = body.uppercase().replace(Regex("\\s+"), " ").trim()
                    val dayKey = p.transactionDate.substring(0, 10)

                    val o = JSONObject()
                    o.put("id", UUID.randomUUID().toString())
                    o.put("amountMinor", p.amountMinor)
                    o.put("currency", "INR")
                    o.put("merchant", p.merchant)
                    o.put("merchantNormalized", normalized)
                    o.put("category", rulesMap[normalized] ?: p.category)
                    o.put("type", p.type)
                    o.put("source", "sms")
                    o.put("paymentMethod", p.paymentMethod ?: JSONObject.NULL)
                    o.put("accountHint", p.accountHint ?: JSONObject.NULL)
                    o.put("transactionDate", p.transactionDate)
                    o.put("createdAt", Mappers.nowIso())
                    o.put("originalMessage", body)
                    o.put("messageHash", Mappers.sha256Hex("$normBody|$dayKey"))
                    o.put("referenceId", p.referenceId ?: JSONObject.NULL)
                    o.put("isTestData", false)
                    val meta = JSONObject()
                    if (p.bank != null) meta.put("bank", p.bank)
                    if (p.sender != null) meta.put("sender", p.sender)
                    if (meta.length() > 0) o.put("metadata", meta)
                    out.put(o)
                }
            }
        } catch (e: Exception) {
            // SMS provider unavailable / revoked — counts stay as-is, never crash.
        }

        val inserted = if (out.length() > 0) txns.insertAll(out, false) else 0
        prefs.edit()
            .putLong(KEY_LAST_SYNC, if (maxDate > since) maxDate + 1 else now)
            .apply()
        return Stats(scanned, parsed, inserted)
    }

    companion object {
        private const val PREFS = "flow_sync"
        private const val KEY_LAST_SYNC = "last_sync"
        private const val MAX_ROWS = 5000
        private const val FIRST_SYNC_WINDOW_MS = 90L * 24 * 60 * 60 * 1000
    }
}
