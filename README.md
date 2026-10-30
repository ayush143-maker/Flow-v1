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

These are available commands, not reported results. Native Android work requires the relevant Android toolchain and is separate from the web preview. No deployment target or production hosting configuration is specified.

## Code map

- `src/screens/` contains the main app screens.
- `src/components/` holds reusable interface components.
- `src/services/analytics/` contains spending and trend calculations.
- `src/services/store/` handles application state and local persistence.
- `src/navigation/` defines the navigation structure.

Amounts are represented as integer paise in the domain model. Preserve this convention when changing transaction or analytics logic.

## Personalizing the interface

For visible app copy or appearance, start in the relevant screen under `src/screens/` and check `src/components/` for shared UI. For settings-related changes, review the existing settings screen and navigation before adding another entry point. Keep finance labels consistent with the integer-paise convention.

The page references `/favicon.svg`. Preserve that root-relative path if the favicon remains at the site root. If the icon moves, update the reference to match; if the app is hosted below a domain subpath, verify that the root-relative URL still points to the intended file. Review `index.html` and the app after changing page metadata or the icon reference.

## Browser and platform review checklist

This is a checklist for future review, not a report of completed compatibility testing or verified results.

- Run the app locally and review the changed screen and its relevant transaction, settings, or onboarding interactions.
- Test in current versions of the browsers relevant to the app's intended audience and stack. Include mobile and desktop browsers where both are relevant; do not infer native Android behavior from a web-browser preview.
- Inspect the browser console for errors and warnings while loading the app and using the changed flow. Investigate errors rather than treating a visible screen as proof that the flow works.
- Inspect the Network panel for failed or unexpectedly repeated requests. Check that local images, fonts, audio, and other referenced assets resolve, and verify that the `/favicon.svg` request reaches the intended file. Review any remote requests introduced by the change and confirm they are intentional.
- Check the app at a narrow phone-sized viewport and a wide desktop-sized viewport. Look for clipped content, overlapping controls, difficult-to-read finance values, and interactions that are awkward at either size.
- If a change affects analytics or amounts, review displayed values against the integer-paise convention.
- For Android-specific changes, review them with the relevant Android toolchain; the web preview alone does not cover native Android work.

## Accessibility review checklist

These are future checks, not claims that accessibility has been verified.

- Navigate the affected flow using only a keyboard. Check that relevant controls can receive focus and be operated without a pointer.
- Check that focus remains visible and is not obscured by overlays or clipped content.
- Review controls and fields for meaningful accessible names, including icon-only controls.
- Check text and control contrast on the affected screens, including secondary labels and text over colored surfaces.
- Check alternatives for meaningful images and ensure decorative imagery does not add redundant announcements.
- If a change adds or alters animation, review it with reduced motion requested and consider reducing nonessential motion.