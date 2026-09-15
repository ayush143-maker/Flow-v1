package com.flow.finance.core.ingest

import com.flow.finance.core.db.FlowDatabase
import com.flow.finance.core.db.Mappers
import com.flow.finance.core.db.RulesRepo
import com.flow.finance.core.db.TransactionRepo
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** Outcome of one ingestion attempt. */
enum class IngestResult { INSERTED, DUPLICATE_HASH, DUPLICATE_REF, DUPLICATE_CROSS }

/**
 * The single ingestion pipeline shared by the SMS reader and the notification
 * listener. Order of protection:
 *
 *   1. reference-id match      — the strongest signal (same UPI/bank ref)
 *   2. cross-source match      — different source (sms vs notification), same
 *                                amount + merchant + type within the dedup
 *                                window → the same payment via two channels
 *   3. message-hash uniqueness — identical message text on the same day
 *
 * Learned merchant rules override the parser's category. Test data and real
 * data never deduplicate against each other.
 */
class Ingestion(private val helper: FlowDatabase) {

    private val txns = TransactionRepo(helper)
    private val rulesRepo = RulesRepo(helper)
    private var rulesCache: MutableMap<String, String>? = null
    private val otherSourceCache = HashMap<String, Boolean>()

    fun ingest(raw: JSONObject): IngestResult {
        val o = prepare(raw)
        val testRows = o.optBoolean("isTestData", false)

        // 1) Reference id already stored?
        val refId = if (o.has("referenceId") && !o.isNull("referenceId")) {
            o.optString("referenceId")
        } else {
            null
        }
        if (refId != null && refId.isNotEmpty() && txns.refExists(refId, testRows)) {
            return IngestResult.DUPLICATE_REF
        }

        // 2) Same payment captured via a different source?
        val source = o.optString("source", "manual")
        if (hasOtherSource(source, testRows)) {
            val newTime = Mappers.parseIsoMs(o.optString("transactionDate"))
            if (newTime != null) {
                val candidates = txns.crossCandidates(
                    o.optLong("amountMinor"),
                    o.optString("merchantNormalized"),
                    o.optString("type"),
                    testRows
                ).mapNotNull { (s, d) ->
                    val t = Mappers.parseIsoMs(d)
                    if (t == null) null else Dedupe.Candidate(s, t)
                }
                if (Dedupe.isCrossSourceDuplicate(source, newTime, candidates)) {
                    return IngestResult.DUPLICATE_CROSS
                }
            }
        }

        // 3) Insert — the UNIQUE index on message_hash rejects identical text.
        val inserted = txns.insertAll(JSONArray().put(o), false)
        return if (inserted > 0) IngestResult.INSERTED else IngestResult.DUPLICATE_HASH
    }

    /** Clone + normalize: merchant key, learned category, hash fallback. */
    private fun prepare(raw: JSONObject): JSONObject {
        val o = JSONObject(raw.toString())
        val normalized = Mappers.normalizeMerchant(o.optString("merchant"))
        o.put("merchantNormalized", normalized)

        val hash = o.optString("messageHash", "")
        if (hash.isEmpty()) o.put("messageHash", UUID.randomUUID().toString())

        rules()[normalized]?.let { o.put("category", it) }
        return o
    }

    private fun rules(): Map<String, String> {
        rulesCache?.let { return it }
        val m = HashMap<String, String>()
        val arr = rulesRepo.list()
        for (i in 0 until arr.length()) {
            val r = arr.getJSONObject(i)
            m[r.optString("merchantNormalized")] = r.optString("category")
        }
        rulesCache = m
        return m
    }

    private fun hasOtherSource(source: String, testRows: Boolean): Boolean =
        otherSourceCache.getOrPut("$source|$testRows") {
            txns.hasRowsWithOtherSource(source, testRows)
        }
}
