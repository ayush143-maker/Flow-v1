# Recurring payment estimates

Recurring payment detection is an inference, not a bank-confirmed schedule. The domain type allows a frequency, last-seen date, optional next-expected date, and an explicit isEstimate marker.

Treat a null nextExpected as not enough evidence to provide a date. Do not replace it with a guessed date simply to fill a card. When showing an estimate, preserve the distinction between an observed transaction and a predicted recurrence.

When changing recurring logic, review monthly lengths, end-of-month dates, sparse transaction history, frequency mismatches, and merchants with inconsistent amounts. The UI should communicate uncertainty rather than presenting estimates as guaranteed future charges.