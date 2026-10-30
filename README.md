# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow: a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and screen navigation. Application state is persisted locally; no remote backend is described.

The main application code is in `src/`. The top-level `package.json` provides the project scripts, while `vite.config.ts` and `tsconfig.json` configure Vite and TypeScript. `capacitor.config.ts` and `android-overlay/` are associated with native Android work. The repository also includes `docs/`, `scripts/`, `snapshots/`, and `tests/`.

## Run and review locally

From the project directory, install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Use the app's navigation to review screens and finance views affected by your change. The package provides these checks:

```sh
npm run typecheck
npm test
npm run build
```

Native Android work requires the relevant Android toolchain and is separate from the web preview. The documented setup covers local development; no deployment target or production hosting configuration is specified.

## Code map

- `src/screens/` contains the main app screens.
- `src/components/` holds reusable interface components.
- `src/services/analytics/` contains spending and trend calculations.
- `src/services/store/` handles application state and local persistence.
- `src/navigation/` defines the navigation structure.

Amounts are represented as integer paise in the domain model. Preserve this convention when changing transaction or analytics logic.