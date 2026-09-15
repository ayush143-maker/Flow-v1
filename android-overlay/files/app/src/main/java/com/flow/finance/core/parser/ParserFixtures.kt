package com.flow.finance.core.parser

import java.util.Calendar

/**
 * Realistic Indian transaction-message corpus. Used by BOTH the JUnit test
 * suite (CI), the in-app "Parser Test" (Developer Tools) and the SMS /
 * notification test generators — so they can never drift apart.
 * Pure Kotlin — no Android dependencies.
 */
object ParserFixtures {

    data class Fixture(
        val sender: String?,
        val body: String,
        val dayOffset: Int = 0,
        val expectParsed: Boolean,
        val expectMerchant: String? = null,
        val expectAmountMinor: Long? = null,
        val expectType: String? = null,
        val expectCategory: String? = null,
        /** Payment-app notification style (drives the notification test generator). */
        val notificationStyle: Boolean = false
    )

    val FIXTURES: List<Fixture> = listOf(
        // ------------------------------------------------------ SMS formats
        Fixture("JD-HDFCBK", "INR 499.00 debited from A/c XX1234 at SWIGGY on 12/10/25. UPI Ref 431298765432.", 3, true, "Swiggy", 49900L, "debit", "Food"),
        Fixture("VM-JIO", "Rs.799 debited from A/c XX5678 for JIO RECHARGE.", 5, true, "Jio", 79900L, "debit", "Bills"),
        Fixture("AD-PAYTM", "UPI txn of Rs 250.00 paid to UBER from your bank account. Ref 887712345678.", 1, true, "Uber", 25000L, "debit", "Travel"),
        Fixture("HDFCBK", "INR 1,299.00 spent on your HDFC Bank Credit Card ending 1234 at AMAZON.", 2, true, "Amazon", 129900L, "debit", "Shopping"),
        Fixture("SBINBS", "Your A/c XX1234 is credited with Rs 25,000.00 (NEFT) on 03/10/25.", 12, true, "Bank Transfer", 2500000L, "credit", "Transfers"),
        Fixture("HDFCBK", "Rs.1,499 refunded to your HDFC Bank Credit Card ending 4321 from AMAZON.", 6, true, "Amazon", 149900L, "credit", "Shopping"),
        Fixture("ATMSBI", "Rs.2,000.00 withdrawn from ATM DLB00123 A/c XX1234 on 11/10/25.", 4, true, "ATM", 200000L, "debit", "Cash"),
        Fixture("OKICICI", "Your A/c XX1234 credited Rs 500.00 by RAVI KUMAR (UPI) Ref 554433221100.", 2, true, "RAVI KUMAR", 50000L, "credit", "Transfers"),
        Fixture("HDFCBK", "Rs 649.00 debited towards NETFLIX subscription on your card ending 4321.", 1, true, "Netflix", 64900L, "debit", "Subscriptions"),
        Fixture("VILMYR", "Your Vodafone recharge of Rs 239 is successful. Txn ID VP230945678.", 8, true, "Vodafone", 23900L, "debit", "Bills"),
        Fixture("HDFCBK", "Your available balance is Rs 12,345.00 in A/c XX1234.", 0, false),
        Fixture("VK-OTPSMS", "Your OTP is 483221. Valid for 10 minutes. Do not share it with anyone.", 0, false),
        Fixture("TM-SEND", "FLAT 50% OFF on all orders! Download the app now. Shop today.", 0, false),
        Fixture("ICICIS", "Rs 1,540.00 spent on ICICI Debit Card xx8821 at INDIAN OIL.", 3, true, "Indian Oil", 154000L, "debit", "Travel"),
        Fixture("SBINBS", "Rs 5,000 debited from A/c XX9911 to RAHUL SHARMA (IMPS). Ref IMPS51248.", 7, true, "RAHUL SHARMA", 500000L, "debit", "Transfers"),
        Fixture("PAYTMIN", "Paid Rs 149 at STARBUCKS via Paytm Wallet.", 1, true, "Starbucks", 14900L, "debit", "Food"),
        Fixture("HDFCBK", "Salary credited Rs 84,500.00 to A/c XX1234 on 01/10/25.", 14, true, "Salary", 8450000L, "credit", "Transfers"),
        Fixture("PHPHONE", "You have received Rs 25 cashback in your PhonePe wallet.", 2, true, "PhonePe", 2500L, "credit", "Transfers"),
        Fixture("JD-HDFCBK", "INR 350.00 debited from A/c XX1234 at ZOMATO on 10-09-2025.", 35, true, "Zomato", 35000L, "debit", "Food"),
        Fixture("BLKBLN", "Rs 120.00 paid to GROFERS via UPI on 5 Oct. UPI Ref 998877.", 10, true, "Grofers", 12000L, "debit", "Groceries"),
        Fixture("HDFCBK", "Rs.1,466.00 spent on HDFC Credit Card xx4321 at BIGBASKET.", 2, true, "BigBasket", 146600L, "debit", "Groceries"),
        Fixture("BSESDL", "Rs 1,200 paid to BSES RAJDHANI for electricity bill.", 9, true, "BSES Rajdhani", 120000L, "debit", "Bills"),
        Fixture("IRCTCI", "Rs 875.50 debited from A/c XX1234 for IRCTC TICKET on 14/10/25.", 1, true, "IRCTC", 87550L, "debit", "Travel"),
        Fixture("HDFCBK", "Your card ending 4321 has been blocked temporarily.", 0, false),
        Fixture("OKHDFC", "Rs 15,000 transferred from A/c XX1234 to PRIYA VERMA (UPI).", 2, true, "PRIYA VERMA", 1500000L, "debit", "Transfers"),
        Fixture("AMAZNI", "Your Amazon order has been shipped and will arrive soon.", 0, false),
        // ------------------------------------- payment-app notification formats
        // dayOffsets deliberately mirror the SMS fixtures above so the test
        // generators demonstrate real cross-source deduplication.
        Fixture("Google Pay", "₹499 paid to Swiggy · UPI Ref 431298765432", 3, true, "Swiggy", 49900L, "debit", "Food", true),
        Fixture("Google Pay", "You paid ₹1,299 to Amazon", 2, true, "Amazon", 129900L, "debit", "Shopping", true),
        Fixture("PhonePe", "Money received: ₹500 from Ravi Kumar via UPI", 2, true, "RAVI KUMAR", 50000L, "credit", "Transfers", true),
        Fixture("Google Pay", "₹250 paid to Uber · UPI Ref 887712345678", 1, true, "Uber", 25000L, "debit", "Travel", true),
        Fixture("PhonePe", "Paid ₹799 for Jio recharge", 5, true, "Jio", 79900L, "debit", "Bills", true),
        Fixture("Google Pay", "₹149 sent to Starbucks", 1, true, "Starbucks", 14900L, "debit", "Food", true),
        Fixture("Paytm", "₹500 withdrawn from ATM", 0, true, "ATM", 50000L, "debit", "Cash", true)
    )

    /** Notification-style fixtures — used by "Generate test notifications". */
    val NOTIFICATION_TEST: List<Fixture>
        get() = FIXTURES.filter { it.notificationStyle }

    data class Outcome(val fixture: Fixture, val parsed: ParsedTxn?, val reason: String?)

    /** Fixed reference timestamp: 15 Oct 2025, 12:00 local. */
    fun baseTimestamp(): Long = Calendar.getInstance().apply {
        clear()
        set(2025, Calendar.OCTOBER, 15, 12, 0, 0)
    }.timeInMillis

    /** Run every fixture through the parser and compare expectations. */
    fun evaluate(): List<Outcome> {
        val ts = baseTimestamp()
        return FIXTURES.map { f ->
            val parsed = TransactionParser.parse(f.sender, f.body, ts)
            Outcome(f, parsed, compare(f, parsed))
        }
    }

    private fun compare(f: Fixture, p: ParsedTxn?): String? {
        if (f.expectParsed && p == null) return "was not parsed"
        if (!f.expectParsed) {
            return if (p != null) {
                "should have been rejected (parsed as ${p.merchant} Rs ${p.amountMinor})"
            } else null
        }
        if (p == null) return "was not parsed"
        if (f.expectAmountMinor != null && p.amountMinor != f.expectAmountMinor) {
            return "amount Rs ${p.amountMinor}, expected Rs ${f.expectAmountMinor}"
        }
        if (f.expectMerchant != null && p.merchant != f.expectMerchant) {
            return "merchant '${p.merchant}', expected '${f.expectMerchant}'"
        }
        if (f.expectType != null && p.type != f.expectType) {
            return "type ${p.type}, expected ${f.expectType}"
        }
        if (f.expectCategory != null && p.category != f.expectCategory) {
            return "category ${p.category}, expected ${f.expectCategory}"
        }
        return null
    }
}
