package com.flow.finance.core.parser

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Flow's on-device transaction parser — pure Kotlin, zero Android dependencies
 * (so it is fully unit-testable on the JVM).
 *
 * Rule-based extraction for Indian bank / PSP message formats:
 * amount, debit vs credit, merchant, payment method, account hint,
 * reference id, date and bank. Nothing ever leaves the device.
 */
data class ParsedTxn(
    val amountMinor: Long,
    val merchant: String,
    val merchantNormalized: String,
    val category: String,
    val type: String, // "debit" | "credit"
    val paymentMethod: String?, // "upi" | "card" | "atm" | "netbanking" | "wallet" | null
    val accountHint: String?,
    val referenceId: String?,
    val transactionDate: String, // ISO-8601 UTC
    val bank: String?,
    val sender: String?
)

object TransactionParser {

    private val DEBIT_WORDS = listOf(
        "DEBITED", "SPENT", "WITHDRAWN", "PURCHASED", "TRANSFERRED",
        "SENT", "PAID", "RECHARGED", "RECHARGE", "PURCHASE", "PAYMENT"
    )
    private val CREDIT_WORDS = listOf(
        "CREDITED", "REFUND", "REFUNDED", "RECEIVED", "DEPOSITED", "CASHBACK", "ADDED"
    )
    private val REJECT_WORDS = listOf(
        "OTP", "ONE TIME PASSWORD", "ONE-TIME PASSWORD", "PASSWORD",
        "T&C", "APPLY NOW", "% OFF", "DOWNLOAD APP"
    )

    private val AMT_PREFIX = Regex("""(?:RS\.?|INR|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)""")
    private val AMT_SUFFIX = Regex("""([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:RS\.?|INR|₹)(?![A-Z0-9])""")

    private val P_ACC = Regex("""\bA/?C\s*(?:NO\.?\s*)?(X{0,4}\d{3,6})\b""")
    private val P_CARD = Regex("""\bCARD\s+(?:ENDING\s+)?(?:XX|X)?(\d{4})\b""")
    private val P_REF = Regex(
        """\b(?:UPI\s+REF(?:ERENCE)?\.?\s*(?:NO\.?)?|REF(?:ERENCE)?\s*(?:NO\.?|ID)?|TXN\s*(?:ID)?|TRANSACTION\s+ID)\s*[:\-]?\s*([A-Z0-9]{6,})"""
    )
    private val P_VPA = Regex("""\b([A-Za-z0-9._-]{2,30})@([A-Za-z]{2,12})\b""")

    private val P_ON_DMY = Regex("""\bON\s+(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b""")
    private val P_ON_DMON = Regex("""\bON\s+(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{2,4})?\b""")

    private val MONTHS = listOf(
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    )

    // Merchant name boundaries: stop at punctuation (incl. the middle dot and
    // dashes used by payment-app notifications), keywords or a date.
    private const val STOP = """\s*(?:[,.!;:•·|–—]|\(|VIA|FROM|FOR|REF|UPI|TXN|A/C|ON\s+\d|\z)"""
    private const val NAME = """([A-Z][A-Z0-9 &'./-]{1,34}?)"""
    private val MERCHANT_PATTERNS = listOf(
        Regex("""\bAT\s+$NAME(?=$STOP)"""),
        Regex("""\bPAID\s+TO\s+$NAME(?=$STOP)"""),
        Regex("""\bTOWARDS\s+$NAME(?=$STOP)"""),
        Regex("""\bTO\s+$NAME(?=$STOP)"""),
        Regex("""\bBY\s+$NAME(?=$STOP)"""),
        Regex("""\bFROM\s+$NAME(?=$STOP)"""),
        Regex("""\bYOUR\s+([A-Z][A-Z0-9 &]{1,24}?)\s+RECHARGE\b"""),
        Regex("""\bFOR\s+$NAME(?=$STOP)""")
    )
    private val BAD_MERCHANT_PREFIXES = listOf("A/C", "YOUR", "THE ", "XX")
    private val BAD_MERCHANTS = setOf("ACCOUNT", "BANK", "CARD", "UPI")

    private val BANK_MAP = linkedMapOf(
        "HDFC" to "HDFC Bank", "ICICI" to "ICICI Bank", "AXIS" to "Axis Bank",
        "KOTAK" to "Kotak Mahindra Bank", "SBIN" to "SBI", "SBI" to "SBI",
        "YESB" to "Yes Bank", "PNB" to "Punjab National Bank", "BOB" to "Bank of Baroda",
        "IDFC" to "IDFC First Bank", "FEDERAL" to "Federal Bank", "INDUSIND" to "IndusInd Bank"
    )

    private const val WINDOW_BACK_MS = 90L * 24 * 60 * 60 * 1000
    private const val WINDOW_FWD_MS = 2L * 24 * 60 * 60 * 1000

    fun parse(sender: String?, body: String?, timestampMs: Long): ParsedTxn? {
        if (body.isNullOrBlank()) return null
        val upper = body.uppercase(Locale.US).replace(Regex("\\s+"), " ").trim()

        // 1) Reject OTP / promo / link-bearing messages outright.
        if (REJECT_WORDS.any { upper.contains(it) }) return null
        if (upper.contains("HTTP") || upper.contains("WWW.")) return null

        // 2) Transaction-type gate. NOTE: indexOf() returns -1 for absent words
        //    and mapNotNull does NOT filter -1 — so misses MUST be turned into
        //    real nulls here (takeIf). Otherwise both indexes are always -1 and
        //    every transaction is misclassified as a debit.
        val debitIdx = DEBIT_WORDS.asSequence()
            .map { upper.indexOf(it) }
            .filter { it >= 0 }
            .minOrNull()
        val creditIdx = CREDIT_WORDS.asSequence()
            .map { upper.indexOf(it) }
            .filter { it >= 0 }
            .minOrNull()
        if (debitIdx == null && creditIdx == null) return null
        val type = if (creditIdx != null && (debitIdx == null || creditIdx < debitIdx)) "credit" else "debit"

        // 3) Amount (first money mention in the message).
        val amount = listOfNotNull(AMT_PREFIX.find(upper), AMT_SUFFIX.find(upper))
            .minByOrNull { it.range.first }
            ?.let { toMinor(it.groupValues[1]) } ?: return null
        if (amount <= 0) return null

        // 4) Merchant: regex extraction → dictionary → body scan → method fallback.
        val method = detectMethod(upper)
        val extracted = extractMerchant(upper)
        val entry = extracted?.let { MerchantDictionary.lookup(it) } ?: MerchantDictionary.scanBody(upper)
        val raw = extracted ?: entry?.display ?: fallbackMerchant(method) ?: return null
        val merchant = entry?.display ?: raw
        val category = entry?.category ?: fallbackCategory(method)
        val normalized = normalize(merchant)

        return ParsedTxn(
            amountMinor = amount,
            merchant = merchant,
            merchantNormalized = normalized,
            category = category,
            type = type,
            paymentMethod = method,
            accountHint = detectAccount(upper),
            referenceId = P_REF.find(upper)?.groupValues?.get(1),
            transactionDate = resolveDate(upper, timestampMs),
            bank = detectBank(upper, sender),
            sender = sender
        )
    }

    // -------------------------------------------------------------- helpers

    private fun toMinor(raw: String): Long? {
        val parts = raw.replace(",", "").split(".")
        val rupees = parts.getOrNull(0)?.takeIf { it.isNotEmpty() }?.toLongOrNull() ?: return null
        val paise = parts.getOrNull(1)?.padEnd(2, '0')?.take(2)?.toLongOrNull() ?: 0L
        return rupees * 100 + paise
    }

    private fun extractMerchant(upper: String): String? {
        for (re in MERCHANT_PATTERNS) {
            val m = re.find(upper) ?: continue
            val name = m.groupValues[1].trim().replace(Regex("\\s+"), " ")
            if (name.isEmpty()) continue
            if (BAD_MERCHANT_PREFIXES.any { name.startsWith(it) }) continue
            if (name in BAD_MERCHANTS) continue
            return name
        }
        P_VPA.find(upper)?.let { return it.groupValues[1].uppercase(Locale.US) }
        return null
    }

    private fun fallbackMerchant(method: String?): String? = when (method) {
        "atm" -> "ATM"
        "card" -> "Card Payment"
        "netbanking" -> "Bank Transfer"
        "upi" -> "UPI Payment"
        "wallet" -> "Wallet Payment"
        else -> null
    }

    private fun fallbackCategory(method: String?): String = when (method) {
        "atm" -> "Cash"
        "upi", "netbanking", "wallet" -> "Transfers"
        else -> "Others"
    }

    private fun detectMethod(upper: String): String? = when {
        upper.contains("ATM") || upper.contains("WITHDRAWN") -> "atm"
        upper.contains("UPI") -> "upi"
        upper.contains("CREDIT CARD") || upper.contains("DEBIT CARD") || P_CARD.containsMatchIn(upper) -> "card"
        upper.contains("NEFT") || upper.contains("IMPS") || upper.contains("RTGS") || upper.contains("NETBANKING") -> "netbanking"
        upper.contains("WALLET") -> "wallet"
        else -> null
    }

    private fun detectAccount(upper: String): String? {
        P_ACC.find(upper)?.let { return "A/c ${it.groupValues[1]}" }
        P_CARD.find(upper)?.let { return "Card x${it.groupValues[1]}" }
        return null
    }

    private fun detectBank(upper: String, sender: String?): String? {
        for ((k, v) in BANK_MAP) if (upper.contains(k)) return v
        if (sender != null) {
            val tail = sender.uppercase(Locale.US).substringAfter("-", sender.uppercase(Locale.US))
            for ((k, v) in BANK_MAP) if (tail.contains(k)) return v
        }
        return null
    }

    private fun resolveDate(upper: String, timestampMs: Long): String {
        val cal = Calendar.getInstance()
        cal.timeInMillis = timestampMs
        var matched = false

        P_ON_DMY.find(upper)?.let { m ->
            val d = m.groupValues[1].toIntOrNull()
            val mo = m.groupValues[2].toIntOrNull()
            var y = m.groupValues[3].toIntOrNull()
            if (y != null && y < 100) y += 2000
            if (d != null && mo != null && y != null && mo in 1..12 && d in 1..31) {
                cal.set(y, mo - 1, d)
                matched = true
            }
        }
        if (!matched) {
            P_ON_DMON.find(upper)?.let { m ->
                val d = m.groupValues[1].toIntOrNull()
                val mo = MONTHS.indexOf(m.groupValues[2]) + 1
                var y = m.groupValues[3].toIntOrNull()
                if (y != null && y < 100) y += 2000
                if (d != null && mo in 1..12 && d in 1..31) {
                    if (y != null) cal.set(y, mo - 1, d)
                    else cal.set(cal.get(Calendar.YEAR), mo - 1, d)
                    matched = true
                }
            }
        }

        val t = cal.timeInMillis
        val valid = matched && t >= timestampMs - WINDOW_BACK_MS && t <= timestampMs + WINDOW_FWD_MS
        return isoUtc(if (valid) t else timestampMs)
    }

    private fun isoUtc(ms: Long): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(Date(ms))
    }

    private fun normalize(name: String): String {
        val sb = StringBuilder()
        for (ch in name.uppercase(Locale.US)) {
            if ((ch in 'A'..'Z') || (ch in '0'..'9') || ch == ' ') sb.append(ch)
        }
        return sb.toString().replace(Regex(" +"), " ").trim()
    }
}
