---
"@quentinroy/snow": minor
---

Call `animation.dispose()` to stop the animation for good and remove its canvas. Animations also work with `using animation = snow(container)`, which disposes them at the end of the scope; your runtime or compiler must support `using`. Snow defines `Symbol.dispose` if your runtime lacks it.
