---
"@quentinroy/snow": patch
---

Changing `flakeColor` now affects new snowflakes only, fixing color changes recoloring every visible flake at once. Existing flakes keep their color until they leave, as they already do for size, speed, and direction.
