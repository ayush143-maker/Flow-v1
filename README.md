# Flow-v1

Flow-v1 is an earlier, more developed iteration of Flow: a local-first personal-finance app built with React, TypeScript, Vite, and Capacitor. It includes transaction management, spending insights, categories, recurring-payment views, onboarding, settings, and screen navigation. Application state is persisted locally; no remote backend is described.

## Run locally

From the project directory, install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

The top-level `index.html` loads `/src/main.tsx`. Use the app navigation to review screens. The package also provides these commands:

```sh
npm run typecheck
npm test
npm run build
```

These are available commands, not reported results. Native Android work associated with `capacitor.config.ts` and `android-overlay/` is separate from the web preview.

## Code map

- `src/screens/` contains the main app screens.
- `src/components/` holds reusable interface components.
- `src/services/analytics/` contains spending and trend calculations.
- `src/services/store/` handles application state and local persistence.
- `src/navigation/` defines the navigation structure.
- `docs/`, `scripts/`, `snapshots/`, and `tests/` are also present in the repository.

Amounts are represented as integer paise in the domain model. Preserve this convention when changing transaction or analytics logic.

## Interface and asset references

For visible copy or appearance, start with the relevant screen in `src/screens/` and check `src/components/` for shared UI. For settings changes, review the existing settings screen and navigation before adding another entry point.

The page references `/favicon.svg`, a root-relative path. Keep that reference if the favicon remains at the site root. If the app will be served from a domain subpath, check whether this root-relative reference resolves correctly there; update the reference and its asset location together if needed. Review `index.html` and the app after changing page metadata or the icon reference.

## Data and configuration

The app persists finance state locally. Treat transaction and account-related data as sensitive: use fictional data in examples and screenshots, and review `src/services/store/` before changing persistence behavior. This README does not describe remote syncing or a backup mechanism.

`vite.config.ts`, `tsconfig.json`, and `capacitor.config.ts` are tracked project configuration, not places to store credentials. No `.env.example` or backend configuration is listed. Do not add real secrets to tracked files; values included in a client build are delivered to users and cannot be treated as secret.

## Deployment-readiness checklist

The repository has a Vite build command, but this README does not specify a hosting target or confirm a deployment. Before publishing the web app:

- [ ] Work from the project root, where `package.json`, `index.html`, and `vite.config.ts` are present.
- [ ] Run the available `npm run build` command and check its output for errors; this README does not report a successful build.
- [ ] Check `vite.config.ts` and the build output to identify the actual generated output directory. Do not assume a directory name if the Vite configuration changes it.
- [ ] Ensure the published files come from that generated output directory, rather than publishing the source tree as though it were the built app.
- [ ] Check asset references, especially `/favicon.svg`. Root-relative URLs may need adjustment when the app is served below a domain subpath; keep references and actual asset locations consistent.
- [ ] No environment-variable template is listed, so this checklist does not require environment configuration. Do not invent values or place secrets in client-side configuration.
- [ ] After publishing, open the resulting page in a browser and review the app navigation, affected screens, favicon, and layouts at narrow and wide viewports. Check any finance values against the integer-paise convention.
- [ ] Treat this final browser review as a recommendation to perform after publishing, not as a report that a deployment or review has already occurred.

Native Android work is separate: a web build or browser preview does not verify the Android work associated with `capacitor.config.ts` and `android-overlay/`.

## Contributor handoff

Keep each change scoped to the relevant screen, component, service, or configuration. Preserve existing filenames and relative references unless the change requires moving a file; when a path changes, update the references that depend on it. In the handoff, summarize what changed and identify the affected files or app areas.

Before publishing, manually review the result in the app: open the affected screens and interactions, check relevant layouts at narrow and wide viewports, and verify any finance values against the integer-paise convention. For Android-specific changes, review the native work separately. This is a review checklist, not a report of completed checks or results.

## Final release review

- Check that `index.html` still points to the intended application entry module before publishing.
- Check the scripts and dependency versions in `package.json`; use the repository's declared workflow rather than assuming a generic build command.
- Verify local references such as `/favicon.svg` resolve with the same relative paths after publishing.
- Review the published result once on a narrow screen and once on a wider screen; treat this as a release check, not an automated test report.

## Repository map

- `capacitor.config.ts` — Capacitor configuration file.
- `docs` — project documentation directory.
- `index.html` — HTML page entry point.
- `package.json` — package manifest, dependency list, and declared scripts.
- `scripts` — project scripts directory.
- `src` — source-code directory.
