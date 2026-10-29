# Manual regression checklist

Use this list after changing transaction, analytics, persistence, navigation, or settings code.

- Add a manual debit and confirm it appears in the transaction list.
- Add a credit and confirm debit-only spending totals do not increase.
- Restart the app and confirm saved data is loaded.
- Check an empty first-run state without existing transactions.
- Check a transaction with punctuation or repeated spaces in the merchant name.
- Open insights with no data and with transactions from multiple categories.
- Review date ranges at a month boundary and around local midnight.
- Open and close settings screens and verify the back path returns to the expected screen.
- Check the app-lock flow with the setting both enabled and disabled.
- Confirm a recurring-payment date is labeled as an estimate when appropriate.

This checklist is not automated test evidence; mark only the checks actually performed.