package com.flow.finance.core.ingest

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Cross-source (SMS vs notification) duplicate matching rules. */
class DedupeTest {

    private val hour = 3_600_000L

    @Test
    fun differentSourceWithinWindowIsDuplicate() {
        val existing = listOf(Dedupe.Candidate("sms", 1_000_000L))
        assertTrue(Dedupe.isCrossSourceDuplicate("notification", 1_000_000L + hour, existing))
    }

    @Test
    fun sameSourceIsNeverACrossDuplicate() {
        val existing = listOf(Dedupe.Candidate("sms", 1_000_000L))
        assertFalse(Dedupe.isCrossSourceDuplicate("sms", 1_000_000L + hour, existing))
    }

    @Test
    fun beyondWindowIsNotDuplicate() {
        val existing = listOf(Dedupe.Candidate("sms", 0L))
        assertFalse(Dedupe.isCrossSourceDuplicate("notification", 3 * hour, existing))
    }

    @Test
    fun exactlyAtWindowEdgeIsDuplicate() {
        val existing = listOf(Dedupe.Candidate("sms", 0L))
        assertTrue(
            Dedupe.isCrossSourceDuplicate("notification", Dedupe.CROSS_SOURCE_WINDOW_MS, existing)
        )
    }

    @Test
    fun noCandidatesMeansNoDuplicate() {
        assertFalse(Dedupe.isCrossSourceDuplicate("notification", 0L, emptyList()))
    }

    @Test
    fun aDifferentSourceCandidateDecides() {
        val existing = listOf(
            Dedupe.Candidate("notification", 48 * hour), // same source, far away
            Dedupe.Candidate("sms", 30 * 60 * 1000L)     // other source, 30 min
        )
        assertTrue(Dedupe.isCrossSourceDuplicate("notification", 0L, existing))
    }
}
