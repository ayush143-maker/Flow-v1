package com.flow.finance.core.db

import android.database.Cursor
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

/**
 * Shared conversion helpers. Date format, merchant normalization and hashing
 * MUST stay in sync with src/utils/format.ts — both sides compute the same
 * values so rules and dedup behave identically.
 */
object Mappers {

    fun nowIso(): String = isoUtc(Date())

    /** UTC ISO-8601 with milliseconds — sorts correctly as TEXT in SQLite. */
    fun isoUtc(date: Date): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(date)
    }

    /** Parse our own ISO strings; null for anything unexpected. */
    fun parseIsoMs(iso: String): Long? = try {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        fmt.parse(iso)?.time
    } catch (e: Exception) {
        null
    }

    fun sha256Hex(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
        val hex = "0123456789abcdef"
        val sb = StringBuilder(digest.size * 2)
        for (b in digest) {
            val v = b.toInt() and 0xFF
            sb.append(hex[v ushr 4]).append(hex[v and 0x0F])
        }
        return sb.toString()
    }

    /** Must stay in sync with normalizeMerchant() in src/utils/format.ts. */
    fun normalizeMerchant(name: String): String {
        val upper = name.uppercase(Locale.US)
        val sb = StringBuilder(upper.length)
        for (ch in upper) {
            if ((ch in 'A'..'Z') || (ch in '0'..'9') || ch == ' ') sb.append(ch)
        }
        return sb.toString().replace(Regex(" +"), " ").trim()
    }

    /**
     * Canonical transaction fingerprint: whitespace-collapsed uppercase message.
     * Same message arriving twice (SMS + notification) yields the same hash,
     * so the UNIQUE index rejects the duplicate.
     */
    fun txnHash(message: String?): String? {
        if (message == null) return null
        val normalized = message.uppercase(Locale.US).replace(Regex("\\s+"), " ").trim()
        return sha256Hex(normalized)
    }
}

fun Cursor.text(col: String): String = getString(getColumnIndexOrThrow(col))

fun Cursor.textOrNull(col: String): String? {
    val i = getColumnIndexOrThrow(col)
    return if (isNull(i)) null else getString(i)
}

fun Cursor.long(col: String): Long = getLong(getColumnIndexOrThrow(col))

fun Cursor.int(col: String): Int = getInt(getColumnIndexOrThrow(col))

fun Cursor.bool(col: String): Boolean = getInt(getColumnIndexOrThrow(col)) == 1
