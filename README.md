# Flow-v1

Flow-v1 is an earlier, more developed iteration of **Flow**, a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It brings together transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and the navigation that connects those screens.

The application keeps its main responsibilities separated: screen components handle presentation, analytics helpers derive spending summaries, and the store layer manages locally persisted data. The Android wrapper and overlay files support the native side of the project.

## Run locally

Install dependencies and start the Vite development server:

    npm install
    npm run dev

The package also provides:

    npm run typecheck
    npm run build
    npm test

The build command creates the web bundle. Native Android work requires the relevant Android toolchain and should be handled separately from web preview.

## Where to look

- src/screens/ contains the main app screens.
- src/components/ holds reusable interface components.
- src/services/analytics/ contains spending and trend calculations.
- src/services/store/ handles application state and persistence.
- src/navigation/ defines the app's navigation structure.

Amounts are represented in integer paise in the domain model. Keep that convention intact when changing transaction or analytics logic.
