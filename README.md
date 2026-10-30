# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow: a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and navigation between screens. Application state is persisted locally; the project does not describe a remote backend.

The top-level `package.json` provides the project scripts. `vite.config.ts` and `tsconfig.json` configure Vite and TypeScript. The main application code is in `src/`; `capacitor.config.ts` and `android-overlay/` are associated with native Android work. The repository also includes `docs/`, `scripts/`, `snapshots/`, and `tests/`.

## Run and review locally

From the project directory, install dependencies and start the Vite development server:

    npm install
    npm run dev

Use the app's navigation to review the screens and finance views affected by your change. Before finishing, the package provides these checks:

    npm run typecheck
    npm test
    npm run build

Native Android work requires the relevant Android toolchain and is separate from the web preview.

## Where to look

- `src/screens/` contains the main app screens.
- `src/components/` holds reusable interface components.
- `src/services/analytics/` contains spending and trend calculations.
- `src/services/store/` handles application state and local persistence.
- `src/navigation/` defines the navigation structure.

Amounts are represented in integer paise in the domain model; preserve that convention when changing transaction or analytics logic.