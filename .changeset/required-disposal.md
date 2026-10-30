---
"@quentinroy/snow": patch
---

Animations always expose `[Symbol.dispose]`, and their TypeScript type supports `using` declarations. Importing Snow initializes `Symbol.dispose` when the runtime does not provide it. The runtime must support `using` syntax, or the application must compile it.
