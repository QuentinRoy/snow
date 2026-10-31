---
"@quentinroy/snow": major
---

Animations now have a `dispose()` method. It cancels the scheduled frame, stops watching the container, and removes the owned canvas. After that, a second `dispose()`, changes to `paused`, and resizes do nothing. Importing Snow initializes `Symbol.dispose` when missing; `using animation = snow(container)` calls `dispose()` for you at the end of the scope.
