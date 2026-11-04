---
"@quentinroy/snow": major
---

Replace `stop()` and `resume()` with a settable `paused` property: set `animation.paused = true` to pause and `animation.paused = false` to resume from where the flakes were. Pass `{ paused: true }` to `snow()` to start paused with the first frame drawn.
