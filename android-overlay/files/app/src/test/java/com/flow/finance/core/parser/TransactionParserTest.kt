package com.flow.finance.core.parser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Automated parser tests — run by CI (gradlew testDebugUnitTest) on every push.
 * The fixture corpus lives in ParserFixtures and is shared with the in-app
 * "Parser Test" in Developer Tools.
 */
class TransactionParserTest {

    @Test
    fun allFixturesMatchExpectations() {
        val failures = ParserFixtures.evaluate().filter { it.reason != null }
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
}
