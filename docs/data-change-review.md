# Stored data change checklist

Use this checklist whenever a change affects src/types/index.ts or persisted objects.

1. Identify which storage key and domain type are affected.
2. Decide how values saved by older app versions should be interpreted.
3. Provide a safe default for missing optional fields.
4. Do not overwrite malformed stored content without an explicit recovery decision.
5. Keep money values in integer minor units.
6. Preserve test-data flags and deduplication identifiers.
7. Consider whether the change affects analytics totals or merchant matching.
8. Add a manual regression step for both existing data and a fresh installation.
9. Avoid logging the contents of financial records during debugging.

A TypeScript interface does not validate the JSON already stored on a device; runtime compatibility must be considered separately.