# Local persistence contract

src/services/store/persistence.ts wraps Capacitor Preferences with JSON serialization.

Current storage keys are centralized in KEYS: profile, transactions, categories, merchant rules, and settings. Do not scatter literal copies of these keys throughout screens.

## Load behavior

loadJSON returns null when no value is stored or when stored content cannot be parsed as JSON. Callers therefore need a sensible first-run/default path and should not assume a non-null return.

## Save behavior

saveJSON serializes the supplied value and awaits the Preferences write. Callers should handle rejected writes at the boundary where an error can be meaningfully shown.

When changing stored shapes, consider existing installations: a type change alone does not migrate persisted data. Validate defaults and compatibility before assuming old settings match the newest interface.