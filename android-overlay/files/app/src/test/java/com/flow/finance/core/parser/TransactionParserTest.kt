package com.flow.finance.core.parser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Automated parser tests — run by CI (gradlew testDebugUnitTest) on every push.
 * The fixture corpus lives in ParserFixtures and is shared with the in-app
 * "Parser Test" in Developer Tools. Failures are printed to stdout so they are
 * always visible in the CI log (not just the HTML report).
 */
class TransactionParserTest {

    @Test
    fun allFixturesMatchExpectations() {
        val outcomes = ParserFixtures.evaluate()
        val failures = outcomes.filter { it.reason != null }
        if (failures.isNotEmpty()) {
            println("Parser fixture failures: ${failures.size}/${outcomes.size}")
            failures.forEach { o ->
                println("  ✗ message: ${o.fixture.body}")
                println("    reason : ${o.reason}")
            }
        }
        val report = failures.joinToString("\n") { "  - ${it.fixture.body}\n    ${it.reason}" }
        assertTrue("Parser fixture failures:\n$report", failures.isEmpty())
    }

    @Test
    fun fixtureCorpusIsSubstantial() {
        assertTrue("Fixture corpus too small", ParserFixtures.FIXTURES.size >= 25)
    }

    @Test
    fun rejectsOtpPromoAndBalanceOnlyMessages() {
        val ts = ParserFixtures.baseTimestamp()
        val rejects = ParserFixtures.FIXTURES.filter { !it.expectParsed }
        assertTrue("No reject fixtures found", rejects.isNotEmpty())
        for (f in rejects) {
            assertNull("Should reject: ${f.body}", TransactionParser.parse(f.sender, f.body, ts))
        }
    }

    @Test
    fun amountsAreConvertedToPaise() {
        val p = TransactionParser.parse(
            "JD-HDFCBK",
            "INR 499.00 debited from A/c XX1234 at SWIGGY on 12/10/25. UPI Ref 431298765432.",
            ParserFixtures.baseTimestamp()
        )
        assertEquals(49900L, p?.amountMinor)
    }

    @Test
    fun creditsAreDetectedAsCredits() {
        // Guards the indexOf/-1 classification bug: a credited amount must be a
        // credit, a debited amount must be a debit.
        val ts = ParserFixtures.baseTimestamp()
        val credit = TransactionParser.parse(
            "SBINBS",
            "Your A/c XX1234 is credited with Rs 25,000.00 (NEFT) on 03/10/25.",
            ts
        )
        val debit = TransactionParser.parse(
            "JD-HDFCBK",
            "INR 499.00 debited from A/c XX1234 at SWIGGY on 12/10/25. UPI Ref 431298765432.",
            ts
        )
        assertEquals("credit", credit?.type)
        assertEquals("debit", debit?.type)
    }
}
