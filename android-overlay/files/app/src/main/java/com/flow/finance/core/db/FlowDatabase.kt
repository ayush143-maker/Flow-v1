package com.flow.finance.core.db

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/**
 * Flow's SQLite database — the single source of truth on the device.
 *
 * Tables: profile, app_settings, categories, merchant_rules, transactions,
 * recurring_payments (written from Phase 5).
 *
 * `message_hash` carries a UNIQUE index: inserting the same message twice
 * (e.g. SMS + notification for one payment) is silently skipped — the base
 * of Flow's duplicate protection.
 */
class FlowDatabase private constructor(context: Context) :
    SQLiteOpenHelper(context.applicationContext, DB_NAME, null, DB_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                icon TEXT NOT NULL,
                color TEXT NOT NULL,
                is_custom INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE merchant_rules (
                id TEXT PRIMARY KEY,
                merchant_normalized TEXT NOT NULL UNIQUE,
                merchant_display TEXT NOT NULL,
                category TEXT NOT NULL,
                hit_count INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE transactions (
                id TEXT PRIMARY KEY,
                amount_minor INTEGER NOT NULL,
                currency TEXT NOT NULL DEFAULT 'INR',
                merchant TEXT NOT NULL,
                merchant_normalized TEXT NOT NULL,
                category TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
                source TEXT NOT NULL,
                payment_method TEXT,
                account_hint TEXT,
                transaction_date TEXT NOT NULL,
                created_at TEXT NOT NULL,
                original_message TEXT,
                message_hash TEXT UNIQUE,
                reference_id TEXT,
                is_test_data INTEGER NOT NULL DEFAULT 0,
                metadata TEXT
            )
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX idx_txns_date ON transactions (transaction_date DESC)")
        db.execSQL("CREATE INDEX idx_txns_merchant ON transactions (merchant_normalized)")
        db.execSQL("CREATE INDEX idx_txns_ref ON transactions (reference_id)")
        db.execSQL(
            """
            CREATE TABLE recurring_payments (
                id TEXT PRIMARY KEY,
                merchant_normalized TEXT NOT NULL UNIQUE,
                merchant TEXT NOT NULL,
                amount_minor INTEGER NOT NULL,
                frequency TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                next_expected TEXT,
                is_estimate INTEGER NOT NULL DEFAULT 1
            )
            """.trimIndent()
        )
        CategoryRepo.seedDefaults(db)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // V1 is the first schema. Future migrations branch on oldVersion here.
    }

    companion object {
        private const val DB_NAME = "flow.db"
        private const val DB_VERSION = 1

        @Volatile
        private var instance: FlowDatabase? = null

        fun get(context: Context): FlowDatabase =
            instance ?: synchronized(this) {
                instance ?: FlowDatabase(context).also { instance = it }
            }
    }
}
