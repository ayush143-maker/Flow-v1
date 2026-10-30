# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow: a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and screen navigation. Application state is persisted locally; no remote backend is described.

The main application code is in `src/`. The top-level `package.json` provides the project scripts, while `vite.config.ts` and `tsconfig.json` configure Vite and TypeScript. `capacitor.config.ts` and `android-overlay/` are associated with native Android work. The repository also includes `docs/`, `scripts/`, `snapshots/`, and `tests/`.

## Run locally

From the project directory, install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Use the app's navigation to reach the screens you want to review. The package provides these checks:

```sh
npm run typecheck
npm test
npm run build
```

These commands are available checks, not reported results. Native Android work requires the relevant Android toolchain and is separate from the web preview. No deployment target or production hosting configuration is specified.

## Code map

- `src/screens/` contains the main app screens.
- `src/components/` holds reusable interface components.
- `src/services/analytics/` contains spending and trend calculations.
- `src/services/store/` handles application state and local persistence.
- `src/navigation/` defines the navigation structure.

Amounts are represented as integer paise in the domain model. Preserve this convention when changing transaction or analytics logic.

## Personalizing the interface

For visible app copy or appearance, start in the relevant screen under `src/screens/` and check `src/components/` for shared UI. For settings-related changes, review the existing settings screen and navigation rather than adding a separate entry point without checking the app's current structure. Keep finance labels consistent with the integer-paise convention.

The page references `/favicon.svg`. Preserve that root-relative path if the favicon remains there; if it moves, update the reference to match. Review `index.html` and the app after changing page-level metadata or the icon reference.

## Manual review checklist

Use this checklist after relevant changes; it records actions to perform, not verified results.

- Open the app using the local Vite preview and navigate to the screen or flow affected by the change.
- Try the relevant existing navigation and screen interactions, including any transaction, settings, or onboarding flow touched by the change.
- Check that referenced images or other media load from their paths. For page-level icon changes, check that the `/favicon.svg` reference matches the file location.
- Inspect the affected screen at a narrow phone-sized viewport and a wide desktop-sized viewport. Look for clipped content, overlapping controls, and hard-to-read finance values.
- If the change affects analytics or amounts, review the displayed values against the integer-paise convention.
- For Android-specific changes, review them with the relevant Android toolchain; the web preview alone does not cover native Android work.
