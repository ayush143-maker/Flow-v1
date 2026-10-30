# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow: a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and screen navigation. Application state is persisted locally; no remote backend is described.

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

## Code map and conventions

- `src/screens/` — main app screens.
- `src/components/` — reusable interface components.
- `src/services/analytics/` — spending and trend calculations.
- `src/services/store/` — application state and local persistence.
- `src/navigation/` — navigation structure.
- `docs/`, `scripts/`, `snapshots/`, and `tests/` — additional project materials.

Amounts are represented as integer paise in the domain model. Preserve this convention when changing transaction or analytics logic.

For visible copy or appearance, start with the relevant screen in `src/screens/` and check `src/components/` for shared UI. For settings changes, review the existing settings screen and navigation before adding another entry point.

## Data and assets

Treat transaction and account-related data as sensitive. Use fictional data in examples and screenshots, and review `src/services/store/` before changing persistence behavior. This README does not describe remote syncing or backups.

The page references `/favicon.svg`, a root-relative path. Keep the favicon at the site root or update the reference and asset location together. If serving from a domain subpath, check that the path resolves there. Review `index.html` after changing page metadata or the icon reference.

`vite.config.ts`, `tsconfig.json`, and `capacitor.config.ts` are tracked configuration files, not places to store credentials. No `.env.example` or backend configuration is listed. Client-build values are delivered to users and cannot be treated as secret.