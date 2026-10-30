---
"@quentinroy/snow": major
---

Animations now have a `dispose()` method. It cancels the scheduled frame, stops watching the canvas, and clears it. After that, a second `dispose()`, changes to `paused`, and resizes do nothing. Where the runtime defines `Symbol.dispose`, `using animation = snow(canvas)` calls `dispose()` for you at the end of the scope.
