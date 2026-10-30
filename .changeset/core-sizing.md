---
"@quentinroy/snow": major
---

Snow now sizes the canvas for you. It watches the canvas and sets `canvas.width` and `canvas.height` to the displayed size times `devicePixelRatio`, then redraws after every resize, whether the animation is playing or paused. Size the canvas with CSS only, and stop setting its width and height yourself.

A resize keeps flakes in the area the old and new sizes share and drops the rest. When a paused animation grows, `fillMode: "instant"` fills the new area right away, and `"none"` leaves it empty until playback resumes.

`draw()` is removed, with no alias. Snow redraws on its own after resizes, so delete any resize code that calls it.
