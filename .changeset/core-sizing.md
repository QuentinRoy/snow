---
"@quentinroy/snow": major
---

`snow()` now accepts an HTML container instead of a canvas. Position the container with CSS (for example, `position: relative`) and give it a drawing area; Snow creates and owns a decorative canvas inside it. Replace `snow(canvas, options)` with `snow(container, options)`.

Snow fills the container's padding box, including padding, without contributing to its layout size or changing its styles. Existing content or CSS layout can determine the container's size; explicit dimensions are optional. Snow warns if the container has `position: static`.

Snow handles canvas sizing and screen-resolution changes automatically, including in vertical writing modes. Resizing keeps flakes at the same size and preserves those in the area the old and new sizes share. The drawing updates even while paused, and flakes do not stretch while waiting for a resize redraw. Remove code that sets the canvas's styles or bitmap dimensions.

`draw()` is removed, with no alias. Snow redraws on its own after resizes, so delete any resize code that calls it.
