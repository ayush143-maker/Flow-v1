package com.flow.finance.core.db

import android.content.ContentValues
import com.getcapacitor.JSObject
import org.json.JSONArray
import java.util.UUID

class RulesRepo(private val helper: FlowDatabase) {

    fun list(): JSONArray {
        val out = JSONArray()
        helper.readableDatabase.query(
            "merchant_rules", null, null, null, null, null, "updated_at DESC"
        ).use { c ->
            while (c.moveToNext()) {
                val o = JSObject()
                o.put("id", c.text("id"))
                o.put("merchantNormalized", c.text("merchant_normalized"))
                o.put("merchantDisplay", c.text("merchant_display"))
                o.put("category", c.text("category"))
                o.put("hitCount", c.int("hit_count"))
                o.put("updatedAt", c.text("updated_at"))
                out.put(o)
            }
        }
        return out
    }

    /** Learn/reinforce a merchant → category mapping. */
    fun upsert(normalized: String, display: String, category: String) {
        val db = helper.writableDatabase
        val now = Mappers.nowIso()
        var exists = false
        db.query(
            "merchant_rules", arrayOf("id"), "merchant_normalized = ?",
            arrayOf(normalized), null, null, null
        ).use { c -> exists = c.moveToFirst() }
        if (exists) {
            db.execSQL(
                "UPDATE merchant_rules SET category = ?, merchant_display = ?, " +
                    "updated_at = ?, hit_count = hit_count + 1 WHERE merchant_normalized = ?",
                arrayOf(category, display, now, normalized)
            )
        } else {
            val cv = ContentValues()
            cv.put("id", UUID.randomUUID().toString())
            cv.put("merchant_normalized", normalized)
            cv.put("merchant_display", display)
            cv.put("category", category)
            cv.put("hit_count", 1)
            cv.put("updated_at", now)
            db.insert("merchant_rules", null, cv)
        }
    }

    fun delete(id: String): Boolean =
        helper.writableDatabase.delete("merchant_rules", "id = ?", arrayOf(id)) > 0
}
