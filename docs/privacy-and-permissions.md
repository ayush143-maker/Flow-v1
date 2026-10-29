# Privacy and permission boundaries

The project describes itself as local-first personal finance software. Transaction messages and financial records are sensitive data and should be handled accordingly.

- Request native permissions only when the related feature needs them.
- Explain the purpose of a permission before prompting where the UI supports it.
- Avoid sending transaction content, account hints, PIN hashes, or raw notification/SMS text to remote services.
- Keep test-data markers intact so fixtures can be distinguished from personal records.
- Do not log raw transaction messages during debugging.
- Treat app-lock settings and the PIN hash as security-sensitive; never display or export the hash.
- If a future feature introduces sync or external analytics, document the data fields, destination, and opt-in behavior before implementing it.

This file records review boundaries; it is not a claim that every platform permission has been audited.