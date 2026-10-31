---
"@quentinroy/snow": major
---

`snow()` now accepts an HTML container instead of a canvas. Position the container with CSS (for example, `position: relative`) and give it a drawing area; Snow creates and owns a decorative canvas inside it. Replace `snow(canvas, options)` with `snow(container, options)`.

One `ResizeObserver` watches the owned canvas. Snow fills the container's padding box, including padding, without contributing to its layout size. The container must be positioned. Snow warns about `position: static` without changing the container's styles. Responsive CSS, `object-fit: none`, and pixel-density scaling keep the previous bitmap unscaled until resize delivery; Snow then resizes the bitmap and redraws, even while paused. A resolution watcher handles pixel-density changes. Existing content or CSS layout can determine the container's size; explicit dimensions are optional.

A resize keeps flakes in the area the old and new sizes share and drops the rest. When a paused animation grows, `fillMode: "instant"` fills the new area right away, and `"none"` leaves it empty until playback resumes.

`draw()` is removed, with no alias. Snow redraws on its own after resizes, so delete any resize code that calls it.
