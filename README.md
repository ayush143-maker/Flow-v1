# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow: a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and screen navigation. Application state is persisted locally; no remote backend is described.

The main application code is in `src/`. The top-level `index.html` is the page entry and loads `/src/main.tsx`. The top-level `package.json` provides project scripts, while `vite.config.ts` and `tsconfig.json` configure Vite and TypeScript. `capacitor.config.ts` and `android-overlay/` are associated with native Android work. The repository also includes `docs/`, `scripts/`, `snapshots/`, and `tests/`.

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

## Troubleshooting

Use these as diagnostic steps, not as claims that the project currently has a problem:

1. **Confirm the entry page.** Start the Vite development server from the project directory and load the app served from that project. The top-level `index.html` loads `/src/main.tsx`; opening a different page or serving a different directory will not preview this entry.
2. **Check paths and local files.** Keep references aligned with files' locations. In particular, `/favicon.svg` is root-relative and expects the favicon at the site root. If a local asset request fails, check both that the file exists and that the reference matches its actual path.
3. **Inspect browser diagnostics.** Check the console for load or runtime errors. In the Network panel, inspect failed requests and the requested URLs to distinguish a missing local file or incorrect path from another loading issue.
4. **Separate local from external resources.** A failed request for a local project asset points to a path or availability check; a failed request to an external host depends on that resource and network access. The README identifies the favicon reference but does not identify a required remote service.

## Configuration and data handling

The repository includes project configuration such as `vite.config.ts`, `tsconfig.json`, and `capacitor.config.ts`; these are tracked configuration files, not places to store credentials. No `.env.example` or backend configuration is listed here. Do not add real secrets to tracked files. If local tooling ever requires private values, keep them outside version control and document only placeholders or setup guidance, without publishing the values.

The app persists finance state locally. Treat real transaction and account-related data as sensitive: use fictional data when documenting, sharing screenshots, or preparing examples, and review `src/services/store/` before changing persistence behavior. This README does not describe remote syncing or a backup mechanism. Values included in the client build are delivered to users and cannot be treated as secret.

## Browser and platform review checklist

This is a checklist for future review, not a report of completed compatibility testing or verified results.

- Run the app locally and review the changed screen and its relevant transaction, settings, or onboarding interactions.
- Test in current versions of browsers relevant to the app's intended audience and stack. Include mobile and desktop browsers where both are relevant; do not infer native Android behavior from a web-browser preview.
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