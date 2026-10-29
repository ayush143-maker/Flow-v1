# Local checks

The project provides npm run dev, npm run typecheck, and npm run build.

- npm run dev serves the app through Vite for iterative UI work.
- npm run typecheck checks the TypeScript types.
- npm run build runs the type check and creates the web distribution bundle.

These commands do not themselves create an Android APK. Use the narrowest appropriate check during development, and state exactly which checks passed in a review summary. Do not claim that a screen was manually exercised merely because TypeScript passed.

No workflow file is needed to document or perform these local checks.