# Merchant categorization

Merchant normalization and learned category mappings reduce duplicate variants of the same merchant.

normalizeMerchant() uppercases a display name, strips punctuation, collapses repeated spaces, and trims the result. The normalized form is a matching key; keep the original display string separately so the UI can remain readable.

A MerchantRule records the normalized key, display name, chosen category, hit count, and update timestamp. User corrections should update the mapping in a predictable way and should not mutate unrelated transactions without an explicit product rule.

When reviewing merchant categorization changes, cover punctuation, repeated whitespace, mixed case, short names, and empty input. Avoid silently inventing a category when a rule cannot be matched.