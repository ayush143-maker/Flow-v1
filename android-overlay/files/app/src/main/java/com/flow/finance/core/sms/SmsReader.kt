package com.flow.finance.core.sms

import android.content.Context
import android.net.Uri
import com.flow.finance.core.db.FlowDatabase
import com.flow.finance.core.db.Mappers
import com.flow.finance.core.ingest.Ingestion
import com.flow.finance.core.ingest.IngestResult
import com.flow.finance.core.parser.TransactionParser
import org.json.JSONObject
import java.util.UUID

/**
 * Incremental, on-device SMS reader.
 *
 * First sync covers the last 90 days; after that only messages newer than the
 * last processed timestamp are read — the inbox is never re-scanned wholesale.
 * Every message flows through the shared Ingestion pipeline (learned rules →
 * reference-id dedup → cross-source dedup → hash-unique insert), so a payment
 * seen in SMS AND a notification is stored exactly once.
 */
class SmsReader(private val context: Context, dbHelper: FlowDatabase) {

    private val ingestion = Ingestion(dbHelper)

    class Stats(val scanned: Int, val parsed: Int, val inserted: Int, val duplicates: Int)

    fun sync(): Stats {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val last = prefs.getLong(KEY_LAST_SYNC, 0L)
        val since = if (last > 0) last else now - FIRST_SYNC_WINDOW_MS

        var scanned = 0
        var parsed = 0
        var inserted = 0
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

                    val o = JSONObject()
                    o.put("id", UUID.randomUUID().toString())
                    o.put("amountMinor", p.amountMinor)
                    o.put("currency", "INR")
                    o.put("merchant", p.merchant)
                    o.put("category", p.category)
                    o.put("type", p.type)
                    o.put("source", "sms")
                    o.put("paymentMethod", p.paymentMethod ?: JSONObject.NULL)
                    o.put("accountHint", p.accountHint ?: JSONObject.NULL)
                    o.put("transactionDate", p.transactionDate)
                    o.put("createdAt", Mappers.nowIso())
                    o.put("originalMessage", body)
                    val normBody = body.uppercase().replace(Regex("\\s+"), " ").trim()
                    o.put("messageHash", Mappers.sha256Hex("$normBody|${p.transactionDate.substring(0, 10)}"))
                    o.put("referenceId", p.referenceId ?: JSONObject.NULL)
                    o.put("isTestData", false)
                    val meta = JSONObject()
                    if (p.bank != null) meta.put("bank", p.bank)
                    if (p.sender != null) meta.put("sender", p.sender)
                    if (meta.length() > 0) o.put("metadata", meta)

                    if (ingestion.ingest(o) == IngestResult.INSERTED) inserted++
                }
            }
        } catch (e: Exception) {
            // SMS provider unavailable / revoked — counts stay as-is, never crash.
        }

        val duplicates = parsed - inserted
        prefs.edit()
            .putLong(KEY_LAST_SYNC, if (maxDate > since) maxDate + 1 else now)
            .apply()
        return Stats(scanned, parsed, inserted, duplicates)
    }

    companion object {
        private const val PREFS = "flow_sync"
        private const val KEY_LAST_SYNC = "last_sync"
        private const val MAX_ROWS = 5000
        private const val FIRST_SYNC_WINDOW_MS = 90L * 24 * 60 * 60 * 1000
    }
}
