# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow: a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and screen navigation. Amounts in the domain model are represented as integer paise. Persistence helpers use Capacitor Preferences; the supplied files do not show remote provider or network calls.

## Run locally

The package manifest specifies Node.js `>=20`. From the project directory, install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

The top-level `index.html` loads `/src/main.tsx`. Use the app navigation to review its screens. Other documented web commands are:

```sh
npm run typecheck
npm test
npm run build
```

These are available commands, not reported results. Native Android work associated with `capacitor.config.ts` and `android-overlay/` is separate from the web preview.

## Code map and interactions

- `src/screens/` — main app screens.
- `src/components/` — reusable interface components.
- `src/services/analytics/` — spending and trend calculations.
- `src/services/store/` — application state and local persistence.
- `src/navigation/` — navigation structure.
- `docs/`, `scripts/`, `snapshots/`, and `tests/` — additional project materials.

Home reads profile, transactions, and categories from the app store. Its month summary has previous/next controls, with next disabled for the current month. The category breakdown shows up to five categories plus an aggregated Other slice; custom categories use custom colors. Today’s activity prioritizes debit transactions and shows up to four, or up to four entries from the transaction array when there are no debits. Home links to settings, categories, the transactions tab, and transaction detail; an empty activity state offers manual transaction entry. The screen memoizes its `now` value on mount, so the shown month calculations do not refresh that value while the screen remains mounted.

Transaction search matches merchant or category text without case sensitivity. Filters cover all transactions, debit, credit, and payment methods equal to `upi` or `card`; the displayed spent total sums debits in the filtered results. The list initially shows up to 40 matches and can add 40 more. Consecutive entries are grouped by computed date label, but this screen does not sort the transaction array before grouping.

Insights offers weekly, monthly, and yearly modes, with totals, trends, category comparisons, top merchants, large debits, and recurring-payment summaries. The shown text-generation call depends on transactions and mount-time `now`, not the selected period. With no transactions, the screen links to developer tools.

## Data and assets

Persistence helpers read and write JSON through Capacitor Preferences under keys for profile, transactions, categories, rules, and settings. Missing values and JSON parse failures load as `null`; saving stringifies values. The supplied files do not show how app-store data is initially acquired or when persistence writes are triggered. Treat transaction and account-related data as sensitive. This README does not describe remote syncing or backups.

The page references `/favicon.svg`, a root-relative path. Keep the favicon at the site root or update the reference and asset location together; check the path if serving from a domain subpath. Review `index.html` after changing page metadata or the icon reference. `vite.config.ts`, `tsconfig.json`, and `capacitor.config.ts` are tracked configuration files, not places to store credentials. No `.env.example` or backend configuration is listed; client-build values are delivered to users and cannot be treated as secret.