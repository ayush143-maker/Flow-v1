# Flow-v1

An earlier Flow personal-finance app iteration using React, Vite, and Capacitor, with Android wrapper/build support and local-first positioning.

## Run locally

Install dependencies with npm install, then run npm run dev for the web app. Use the Android scripts included in package.json for a native build; an Android SDK and Java toolchain may be required.

## Development workflow

Start with the package scripts and the existing source organization. Locate the page or screen component and its imports before changing the UI. Keep shared components and styles consistent rather than duplicating the same behavior in multiple places.

## Validation

Run the development server while iterating, then run the production build before deployment. Check type/build output, browser-console messages, navigation, and the final deployed page. Native-wrapper projects also need a separate on-device test after syncing the web build.
