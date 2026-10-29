# Analytics calculation semantics

Pure analytics helpers live in src/services/analytics.

- debits() and credits() filter by transaction type.
- inRange(txns, from, to) treats the start as inclusive and the end as exclusive.
- periodStats() aggregates debits in the requested range and reports a daily average using at least one day.
- categoryBreakdown() aggregates debit amounts and counts by category; category share is zero when the total is zero.
- topMerchants() groups by normalized merchant key and ranks by aggregate debit amount.
- dailyTotals() returns a fixed-length sequence ordered oldest to newest for the requested window.

Keep these definitions stable when changing chart presentation. UI labels and chart labels should not quietly redefine the underlying period boundaries.