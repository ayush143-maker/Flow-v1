# Finance domain model

The canonical domain types are in src/types/index.ts.

## Money

Transaction amounts are stored as integer minor units: 100 means ₹1.00. Do not persist floating-point rupees for arithmetic. Convert to display strings only at the presentation boundary.

## Transactions

A transaction records its type, source, merchant, normalized merchant key, category, transaction timestamp, creation timestamp, source message hash, optional reference ID, and whether it is test data. Keep the normalized merchant key stable enough for deduplication and merchant rules.

## Categories and merchant rules

Categories have stable IDs and display attributes. Merchant rules represent learned or user-corrected mappings from normalized merchants to categories. Keep display merchant names separate from normalized matching keys.

## Recurring payments

A recurring payment can contain an estimated next date. A null nextExpected means no expected date is available, and isEstimate must be respected by the UI. An estimate should not be presented as a confirmed upcoming debit.