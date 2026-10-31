---
"@quentinroy/snow": major
---

Replace `stop()` and `resume()` with a settable `paused` property. Set `animation.paused = true` to pause and `animation.paused = false` to resume. Resuming continues from the same flake positions and ignores the time spent paused.

Pass `paused: true` to `snow(container, { paused: true })` to draw the first frame and start without scheduling more.

`stop()` and `resume()` are removed, with no aliases.
