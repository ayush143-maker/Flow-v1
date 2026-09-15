package com.flow.finance.core.ingest

import kotlin.math.abs

/**
 * Pure duplicate-matching rules — unit-tested on the JVM (no Android needed).
 *
 * The cross-source window is deliberately tight: an SMS and a notification
 * for the SAME payment arrive within seconds-to-minutes of each other, while
 * two genuinely different purchases of the same amount rarely collide inside
 * the window. Keeping it small protects real distinct transactions (including
 * the seeded demo data) from being wrongly merged.
 */
object Dedupe {

    /** 2 hours. */
    const val CROSS_SOURCE_WINDOW_MS: Long = 2L * 60 * 60 * 1000

    data class Candidate(val source: String, val timeMs: Long)

    /**
     * True when an existing row from a DIFFERENT source matches the same
     * amount + merchant + type (pre-filtered by the caller) within the window.
     */
    fun isCrossSourceDuplicate(
        newSource: String,
        newTimeMs: Long,
        candidates: List<Candidate>
    ): Boolean = candidates.any {
        it.source != newSource && abs(it.timeMs - newTimeMs) <= CROSS_SOURCE_WINDOW_MS
    }
}
