---
"@quentinroy/snow": patch
---

Apply density changes through arrivals and departures. Increasing density adds incoming flakes; decreasing it retires excess flakes when they leave, including a natural drain at zero density.

Keep visible flakes at their current size, speed, direction, and color until they leave. Apply updated settings to their next entry. Limit `autoFill` to startup and newly exposed resize areas so toggling it does not reveal waiting flakes.
