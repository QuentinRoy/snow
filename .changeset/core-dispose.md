---
"@quentinroy/snow": minor
---

Call `animation.dispose()` to stop the animation permanently and remove its canvas. Repeated calls, changes to `paused`, and resizes after disposal do nothing.

Animations also support `using animation = snow(container)` for disposal at the end of a scope, including through the published TypeScript declarations. `[Symbol.dispose]()` does the same as `dispose()`. Importing Snow initializes `Symbol.dispose` globally when missing; your runtime must support `using` syntax, or your application must compile it.
