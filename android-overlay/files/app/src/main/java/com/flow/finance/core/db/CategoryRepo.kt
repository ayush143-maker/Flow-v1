package com.flow.finance.core.db

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import com.getcapacitor.JSObject
import org.json.JSONArray
import java.util.UUID

class CategoryRepo(private val helper: FlowDatabase) {

    fun list(): JSONArray {
        val out = JSONArray()
        helper.readableDatabase.query(
            "categories", null, null, null, null, null, "created_at ASC"
        ).use { c ->
            while (c.moveToNext()) {
                val o = JSObject()
                o.put("id", c.text("id"))
                o.put("name", c.text("name"))
                o.put("icon", c.text("icon"))
                o.put("color", c.text("color"))
                o.put("isCustom", c.bool("is_custom"))
                o.put("createdAt", c.text("created_at"))
                out.put(o)
            }
        }
        return out
    }

    /** Returns false when a category with the same name already exists. */
    fun insert(name: String, icon: String, color: String): Boolean {
        val cv = ContentValues()
        cv.put("id", UUID.randomUUID().toString())
        cv.put("name", name)
        cv.put("icon", icon)
        cv.put("color", color)
        cv.put("is_custom", 0)
        cv.put("created_at", Mappers.nowIso())
        val row = helper.writableDatabase.insertWithOnConflict(
            "categories", null, cv, SQLiteDatabase.CONFLICT_IGNORE
        )
        return row != -1L
    }

    /**
     * Update fields; a rename cascades to transactions and merchant rules
     * inside one transaction so data never diverges.
     */
    fun update(id: String, name: String?, icon: String?, color: String?): Boolean {
        val db = helper.writableDatabase
        var oldName: String? = null
        db.query("categories", arrayOf("name"), "id = ?", arrayOf(id), null, null, null).use { c ->
            if (c.moveToFirst()) oldName = c.getString(0)
        }
        val current = oldName ?: return false
        val newName = name?.trim()?.takeIf { it.isNotEmpty() } ?: current
        if (newName != current) {
            var dup = false
            db.query(
                "categories", arrayOf("id"), "name = ? AND id != ?", arrayOf(newName, id),
                null, null, null
            ).use { c -> dup = c.moveToFirst() }
            if (dup) return false
        }
        db.beginTransaction()
        try {
            val cv = ContentValues()
            if (icon != null) cv.put("icon", icon)
            if (color != null) cv.put("color", color)
            cv.put("name", newName)
            db.update("categories", cv, "id = ?", arrayOf(id))
            if (newName != current) {
                db.execSQL("UPDATE transactions SET category = ? WHERE category = ?", arrayOf(newName, current))
                db.execSQL("UPDATE merchant_rules SET category = ? WHERE category = ?", arrayOf(newName, current))
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return true
    }

    /** Custom categories only. Transactions/rules move to Others. */
    fun delete(id: String): Boolean {
        val db = helper.writableDatabase
        var isCustom = false
        var name: String? = null
        db.query(
            "categories", arrayOf("is_custom", "name"), "id = ?", arrayOf(id),
            null, null, null
        ).use { c ->
            if (c.moveToFirst()) {
                isCustom = c.getInt(0) == 1
                name = c.getString(1)
            }
        }
        val n = name ?: return false
        if (!isCustom) return false
        db.beginTransaction()
        try {
            db.execSQL("UPDATE transactions SET category = 'Others' WHERE category = ?", arrayOf(n))
            db.execSQL("UPDATE merchant_rules SET category = 'Others' WHERE category = ?", arrayOf(n))
            db.delete("categories", "id = ?", arrayOf(id))
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return true
    }

    companion object {
        /** Called during database creation. Mirrors DEFAULT_CATEGORIES in tokens.ts. */
        fun seedDefaults(db: SQLiteDatabase) {
            for (d in CategoryDefaults.ALL) {
                val cv = ContentValues()
                cv.put("id", UUID.randomUUID().toString())
                cv.put("name", d.name)
                cv.put("icon", d.icon)
                cv.put("color", d.color)
                cv.put("is_custom", 0)
                cv.put("created_at", Mappers.nowIso())
                db.insertWithOnConflict("categories", null, cv, SQLiteDatabase.CONFLICT_IGNORE)
            }
        }
    }
}

object CategoryDefaults {
    data class Def(val name: String, val icon: String, val color: String)

    val ALL = listOf(
        Def("Food", "food", "#FF7A59"),
        Def("Shopping", "shopping", "#7C6CF0"),
        Def("Travel", "travel", "#38BDF8"),
        Def("Bills", "bills", "#F5A524"),
        Def("Entertainment", "entertainment", "#F472B6"),
        Def("Health", "health", "#2FD6B3"),
        Def("Education", "education", "#60A5FA"),
        Def("Groceries", "groceries", "#4ADE80"),
        Def("Subscriptions", "subscriptions", "#A78BFA"),
        Def("Cash", "cash", "#94A3B8"),
        Def("Transfers", "transfers", "#CBD5E1"),
        Def("Others", "others", "#8B97AC")
    )
}
