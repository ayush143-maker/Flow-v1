# Architecture map

The root App component composes the application in this order:
1. AppStoreProvider owns access to persisted application state.
2. NavigationProvider exposes the in-app navigation context.
3. AppRoot chooses the active screen layout.

Screen modules are grouped by responsibility: home, insights, onboarding, settings, transactions, and shared screens. Reusable visual pieces live under src/components; analytics calculations live under src/services/analytics; persistence is separated under src/services/store.

When adding a screen, reuse existing navigation and store boundaries rather than introducing another global provider. Keep pure calculations out of presentation components when they can live in a service module.