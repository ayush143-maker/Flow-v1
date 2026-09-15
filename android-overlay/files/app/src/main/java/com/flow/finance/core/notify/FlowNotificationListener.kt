package com.flow.finance.core.notify

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.flow.finance.core.db.FlowDatabase
import com.flow.finance.core.db.Mappers
import com.flow.finance.core.db.MetaRepo
import com.flow.finance.core.ingest.Ingestion
import com.flow.finance.core.parser.TransactionParser
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Flow's notification listener — special-access service the user enables in
 * Android Settings (no runtime permission dialog).
 *
 * Pipeline: notification → financial gate → on-device parser → merchant-rule
 * application → duplicate detection → SQLite. Identical ingestion path to the
 * SMS reader, so one payment detected by both sources is stored exactly once.
 * Never performs network I/O; non-financial notifications are ignored.
 */
class FlowNotificationListener : NotificationListenerService() {

    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
    private lateinit var ingestion: Ingestion
    private lateinit var meta: MetaRepo

    override fun onCreate() {
        super.onCreate()
        val db = FlowDatabase.get(this)
        ingestion = Ingestion(db)
        meta = MetaRepo(db)
    }

    override fun onDestroy() {
        executor.shutdown()
        super.onDestroy()
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        heartbeat(System.currentTimeMillis())
    }

    override fun onListenerDisconnected() {
        heartbeat(0L)
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        executor.execute {
            try {
                if (this::ingestion.isInitialized) process(sbn)
            } catch (e: Exception) {
                // Never crash the system's listener binding.
            }
        }
    }

    private fun heartbeat(at: Long) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_CONNECTED_AT, at)
            .apply()
    }

    private fun process(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return // our own notifications
        if (sbn.isOngoing) return // media players, progress bars etc.
        val n = sbn.notification ?: return
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val extras = n.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim().orEmpty()
        val text = if (bigText.isNotEmpty()) {
            bigText
        } else {
            extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
        }
        if (title.isEmpty() && text.isEmpty()) return
        val combined = when {
            title.isEmpty() -> text
            text.isEmpty() -> title
            else -> "$title. $text"
        }

        // Financial gate: known payment/bank apps always proceed; anything
        // else must carry BOTH a money amount and a transaction keyword.
        val upper = combined.uppercase()
        val financial = sbn.packageName in FINANCIAL_PACKAGES ||
            (MONEY_MARK.containsMatchIn(upper) && TXN_MARK.containsMatchIn(upper))
        if (!financial) return

        // Respect the in-app "process notifications" toggle.
        if (!meta.getSettings().optBoolean("notificationsEnabled", true)) return

        val sender = appLabel(sbn.packageName)
        val parsed = TransactionParser.parse(sender, combined, sbn.postTime) ?: return

        val o = JSONObject()
        o.put("id", UUID.randomUUID().toString())
        o.put("amountMinor", parsed.amountMinor)
        o.put("currency", "INR")
        o.put("merchant", parsed.merchant)
        o.put("category", parsed.category)
        o.put("type", parsed.type)
        o.put("source", "notification")
        o.put("paymentMethod", parsed.paymentMethod ?: JSONObject.NULL)
        o.put("accountHint", parsed.accountHint ?: JSONObject.NULL)
        o.put("transactionDate", parsed.transactionDate)
        o.put("createdAt", Mappers.nowIso())
        o.put("originalMessage", combined)
        val normBody = upper.replace(Regex("\\s+"), " ").trim()
        o.put("messageHash", Mappers.sha256Hex("$normBody|${parsed.transactionDate.substring(0, 10)}"))
        o.put("referenceId", parsed.referenceId ?: JSONObject.NULL)
        o.put("isTestData", false)
        o.put("metadata", JSONObject().put("sender", sender))

        ingestion.ingest(o)
    }

    private fun appLabel(pkg: String): String = try {
        packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (e: Exception) {
        pkg
    }

    companion object {
        const val PREFS = "flow_notify"
        const val KEY_CONNECTED_AT = "listener_connected_at"

        /** Indian payment/banking apps whose notifications are always parsed. */
        private val FINANCIAL_PACKAGES = setOf(
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                        // PhonePe
            "net.one97.paytm",                        // Paytm
            "in.amazon.mShop.android.shopping",       // Amazon (Pay)
            "in.org.npci.upiapp",                     // BHIM UPI
            "com.dreamplug.androidapp",               // CRED
            "com.csam.icici.bank"                     // ICICI iMobile
        )

        private val MONEY_MARK = Regex("""(?:RS\.?|INR|₹)\s*[0-9]""")
        private val TXN_MARK =
            Regex("""\b(PAID|DEBITED|CREDITED|SPENT|SENT|RECEIVED|WITHDRAWN|REFUND|RECHARGE)\b""")
    }
}
