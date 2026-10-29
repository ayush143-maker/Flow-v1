# Navigation boundaries

Navigation state is owned by src/navigation/NavigationProvider.tsx, with screen identifiers described in src/navigation/types.ts. src/screens/AppRoot.tsx connects navigation state to screen rendering.

Screens should request navigation through the shared provider instead of maintaining competing app-wide routes. Shared screens such as lock gates and pin pads should remain reusable across entry points. Settings sub-screens should preserve a predictable route back to Settings.

When adding a route, update the navigation types first, then wire the destination and confirm both forward and back navigation. Avoid placing transaction persistence or analytics calculations in the navigation layer.