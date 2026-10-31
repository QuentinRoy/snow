---
"@quentinroy/snow": major
---

`snow()` now accepts an HTML container instead of a canvas. Size the container with CSS; Snow creates and owns a decorative canvas inside it. Replace `snow(canvas, options)` with `snow(container, options)`. Canvas inputs are rejected.

One `ResizeObserver` watches the container's content box. Snow updates the canvas's pixel CSS dimensions, bitmap resolution, and drawing together, even while paused. The canvas does not participate in layout, preventing its bitmap from stretching during live resizing. Statically positioned containers receive `position: relative`, restored on disposal unless changed by the caller.

A resize keeps flakes in the area the old and new sizes share and drops the rest. When a paused animation grows, `fillMode: "instant"` fills the new area right away, and `"none"` leaves it empty until playback resumes.

`draw()` is removed, with no alias. Snow redraws on its own after resizes, so delete any resize code that calls it.
