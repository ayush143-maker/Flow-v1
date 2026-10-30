# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow, a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. Its interface includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and navigation between app screens. Application state is persisted locally; the repository does not describe a remote backend.

## Run locally

From the project directory, install dependencies and start the Vite development server:

    npm install
    npm run dev

Use the app's navigation to access its screens and finance views. The package also provides:

    npm run typecheck
    npm run build
    npm test

Native Android work requires the relevant Android toolchain and is separate from the web preview.

## Where to look

- `src/screens/` contains the main app screens.
- `src/components/` holds reusable interface components.
- `src/services/analytics/` contains spending and trend calculations.
- `src/services/store/` handles application state and local persistence.
- `src/navigation/` defines the navigation structure.

Amounts are represented in integer paise in the domain model; preserve that convention when changing transaction or analytics logic.