---
"@quentinroy/snow": minor
---

Replace `flow` with `density`, the number of snowflakes per 1,000 × 1,000 CSS-pixel area. Add `autoFill` (enabled by default) to fill the initial canvas and newly exposed areas after resizing. Disabling it lets snow enter through the edges.

Recycle flakes to keep the population independent of speed and direction. Apply size, speed, direction, and color changes to existing flakes. Use CSS pixels for sizes and speeds so canvas resolution does not affect coverage.
