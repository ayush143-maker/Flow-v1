package com.flow.finance.core.db

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.getcapacitor.JSObject
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class TransactionRepo(private val helper: FlowDatabase) {

    data class MerchantRef(val normalized: String, val display: String)

    fun list(limit: Int): JSONArray {
        val out = JSONArray()
        helper.readableDatabase.query(
            "transactions", null, null, null, null, null,
            "transaction_date DESC, created_at DESC", "$limit"
        ).use { c ->
            while (c.moveToNext()) out.put(txnToJson(c))
        }
        return out
    }

    fun count(): Int = countWhere(null, null)

    fun countTest(): Int = countWhere("is_test_data = 1", null)

    fun countBySource(source: String): Int = countWhere("source = ?", arrayOf(source))

    private fun countWhere(where: String?, args: Array<String>?): Int {
        helper.readableDatabase
            .query("transactions", arrayOf("COUNT(*)"), where, args, null, null, null)
            .use { c ->
                return if (c.moveToFirst()) c.getInt(0) else 0
            }
    }

    /** A transaction with this reference id already exists (same testness). */
    fun refExists(refId: String, testRows: Boolean): Boolean {
        helper.readableDatabase.query(
            "transactions", arrayOf("1"),
            "reference_id = ? AND is_test_data = ?",
            arrayOf(refId, if (testRows) "1" else "0"),
            null, null, null, "1"
        ).use { return it.moveToFirst() }
    }

    /** Any stored row from a different source (same testness)? */
    fun hasRowsWithOtherSource(source: String, testRows: Boolean): Boolean {
        helper.readableDatabase.query(
            "transactions", arrayOf("1"),
            "source != ? AND is_test_data = ?",
            arrayOf(source, if (testRows) "1" else "0"),
            null, null, null, "1"
        ).use { return it.moveToFirst() }
    }

    /**
     * Rows sharing amount + merchant + type (same testness) as (source, iso-date)
     * pairs — the candidate set for cross-source duplicate matching.
     */
    fun crossCandidates(
        amountMinor: Long,
        merchantNormalized: String,
        type: String,
        testRows: Boolean
    ): List<Pair<String, String>> {
        val out = ArrayList<Pair<String, String>>(4)
        helper.readableDatabase.query(
            "transactions",
            arrayOf("source", "transaction_date"),
            "amount_minor = ? AND merchant_normalized = ? AND type = ? AND is_test_data = ?",
            arrayOf(amountMinor.toString(), merchantNormalized, type, if (testRows) "1" else "0"),
            null, null, null, "50"
        ).use { c ->
            val iS = c.getColumnIndexOrThrow("source")
            val iD = c.getColumnIndexOrThrow("transaction_date")
            while (c.moveToNext()) out.add(Pair(c.getString(iS), c.getString(iD)))
        }
        return out
    }

    fun clearTestData(): Int =
        helper.writableDatabase.delete("transactions", "is_test_data = 1", null)

    /**
     * Applies a category correction to the transaction AND every stored
     * transaction of the same merchant. Returns the merchant so the caller
     * can upsert the merchant rule.
     */
    fun applyCategory(txnId: String, category: String): MerchantRef? {
        val db = helper.writableDatabase
        var display: String? = null
        var normalized: String? = null
        db.query(
            "transactions", arrayOf("merchant", "merchant_normalized"),
            "id = ?", arrayOf(txnId), null, null, null
        ).use { c ->
            if (c.moveToFirst()) {
                display = c.getString(0)
                normalized = c.getString(1)
            }
        }
        val m = normalized ?: return null
        val d = display ?: m
        db.beginTransaction()
        try {
            db.execSQL(
                "UPDATE transactions SET category = ? WHERE merchant_normalized = ?",
                arrayOf(category, m)
            )
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return MerchantRef(m, d)
    }

    /**
     * Bulk insert. `replaceAll` wipes the table first (demo reset);
     * otherwise INSERT OR IGNORE skips rows whose message_hash already
     * exists (duplicate protection). Caller-provided messageHash wins over
     * the body-derived hash so the ingestion pipeline can include the day key.
     */
    fun insertAll(arr: JSONArray, replaceAll: Boolean): Int {
        val db = helper.writableDatabase
        var inserted = 0
        db.beginTransaction()
        try {
            if (replaceAll) db.delete("transactions", null, null)
            for (i in 0 until arr.length()) {
                val cv = txnFromJson(arr.getJSONObject(i))
                val rowId = db.insertWithOnConflict(
                    "transactions", null, cv, SQLiteDatabase.CONFLICT_IGNORE
                )
                if (rowId != -1L) inserted++
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return inserted
    }

    private fun txnFromJson(o: JSONObject): ContentValues {
        val now = Mappers.nowIso()
        val cv = ContentValues()
        cv.put("id", o.optString("id", UUID.randomUUID().toString()))
        cv.put("amount_minor", o.optLong("amountMinor", 0L))
        cv.put("currency", o.optString("currency", "INR"))
        cv.put("merchant", o.optString("merchant", "Unknown"))
        cv.put("merchant_normalized", Mappers.normalizeMerchant(o.optString("merchant", "Unknown")))
        cv.put("category", o.optString("category", "Others"))
        cv.put("type", o.optString("type", "debit"))
        cv.put("source", o.optString("source", "manual"))
        cv.put("payment_method", optStringOrNull(o, "paymentMethod"))
        cv.put("account_hint", optStringOrNull(o, "accountHint"))
        cv.put("transaction_date", o.optString("transactionDate", now))
        cv.put("created_at", o.optString("createdAt", now))
        cv.put("original_message", optStringOrNull(o, "originalMessage"))
        cv.put(
            "message_hash",
            optStringOrNull(o, "messageHash")
                ?: Mappers.txnHash(optStringOrNull(o, "originalMessage"))
                ?: UUID.randomUUID().toString()
        )
        cv.put("reference_id", optStringOrNull(o, "referenceId"))
        cv.put("is_test_data", if (o.optBoolean("isTestData", false)) 1 else 0)
        cv.put("metadata", optJsonString(o, "metadata"))
        return cv
    }

    private fun txnToJson(c: Cursor): JSObject {
        val o = JSObject()
        o.put("id", c.text("id"))
        o.put("amountMinor", c.long("amount_minor"))
        o.put("currency", c.text("currency"))
        o.put("merchant", c.text("merchant"))
        o.put("merchantNormalized", c.text("merchant_normalized"))
        o.put("category", c.text("category"))
        o.put("type", c.text("type"))
        o.put("source", c.text("source"))
        o.put("paymentMethod", c.textOrNull("payment_method") ?: JSONObject.NULL)
        o.put("accountHint", c.textOrNull("account_hint") ?: JSONObject.NULL)
        o.put("transactionDate", c.text("transaction_date"))
        o.put("createdAt", c.text("created_at"))
        o.put("originalMessage", c.textOrNull("original_message") ?: JSONObject.NULL)
        o.put("messageHash", c.textOrNull("message_hash") ?: JSONObject.NULL)
        o.put("referenceId", c.textOrNull("reference_id") ?: JSONObject.NULL)
        o.put("isTestData", c.bool("is_test_data"))
        val metaStr = c.textOrNull("metadata")
        if (metaStr != null) {
            try {
                o.put("metadata", JSONObject(metaStr))
            } catch (e: Exception) {
                // Corrupt metadata JSON is skipped, never fatal.
            }
        }
        return o
    }

    private fun optStringOrNull(o: JSONObject, key: String): String? =
        if (o.has(key) && !o.isNull(key)) o.optString(key) else null

    private fun optJsonString(o: JSONObject, key: String): String? {
        if (!o.has(key) || o.isNull(key)) return null
        return try {
            o.optJSONObject(key)?.toString()
        } catch (e: Exception) {
            null
        }
    }
}
