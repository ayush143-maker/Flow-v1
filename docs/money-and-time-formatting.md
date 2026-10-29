# Money and time formatting

Formatting helpers are centralized in src/utils/format.ts so screens share one set of conventions.

## Currency

Use integer minor units for internal values and formatMoney() or formatMoneyCompact() for display. The full formatter uses the en-IN locale and INR currency style. Compact formatting uses rupee labels with lakh/crore suffixes for large values.

The formatter returns display text, not a value for arithmetic. Keep calculations on numeric minor units.

## Dates and times

The helpers use Date and the en-IN locale for day labels, dates, and times. dayLabel() uses local start-of-day comparisons to label same-day and previous-day entries. Avoid comparing formatted date strings for business logic.

When changing date ranges, test month boundaries, year boundaries, and transactions around local midnight.