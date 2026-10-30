# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow, a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and navigation. Screens, analytics helpers, and locally persisted application state are organised in separate layers.

## Run locally

Install dependencies and start the Vite development server:

    npm install
    npm run dev

The package also provides:

    npm run typecheck
    npm run build
    npm test

Native Android work requires the relevant Android toolchain and is separate from web preview.

## Where to look

- `src/screens/` contains the main app screens.
- `src/components/` holds reusable interface components.
- `src/services/analytics/` contains spending and trend calculations.
- `src/services/store/` handles application state and persistence.
- `src/navigation/` defines the navigation structure.

Amounts are represented in integer paise in the domain model; preserve that convention when changing transaction or analytics logic.