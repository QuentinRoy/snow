---
"@quentinroy/snow": patch
---

Replace quota-based recycling with independently timed edge arrivals. Density changes immediately adjust incoming snowfall while existing flakes leave naturally, avoiding pauses and synchronized respawning after large reductions.

Weight arrivals by crossing speed and direction to preserve the intended visible distribution without accumulating slow flakes or imposing a minimum speed. Density now describes average coverage rather than an exact population. Preserve automatic startup and resize filling, visible flake attributes, and individual drawing order.
