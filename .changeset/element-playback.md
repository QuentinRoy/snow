---
"@quentinroy/snow": minor
---

Let `<snow-fall>` pause and respect reduced motion. Add the `paused` attribute to freeze the snow, and remove it to continue. The element also stops when the system asks for reduced motion and starts again when that setting is turned off, without changing `paused`. Add `ignore-reduced-motion` to keep animating regardless; `paused` still wins.

Taking the element out of the page stops its animation. Putting it back continues with the same flakes, and the time away doesn't move them.
