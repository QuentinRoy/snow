---
"@quentinroy/snow": major
---

`snow()` now takes an HTML container instead of a canvas, so Snow can size its own canvas. Replace `snow(canvas, options)` with `snow(container, options)`, and give the container a position other than `static` (for example, `position: relative`); Snow warns otherwise. Snow fills the container's padding box without changing its layout.

Snow keeps the canvas sized and sharp when the container or screen resolution changes, and keeps flakes that stay in view. Remove code that sets the canvas size, and calls to `draw()`, which is removed.
