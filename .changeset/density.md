---
"@quentinroy/snow": major
---

Replace `flow` with `density`, the average number of snowflakes per 1,000 × 1,000 CSS pixels. With `flow`, the amount of visible snow changed with canvas size, speed, and direction, so the same value looked different across screens and settings. `density` sets the amount of snow directly. There is no exact conversion: replace `flow` with `density` and tune it to taste, starting from the default of `30`.
