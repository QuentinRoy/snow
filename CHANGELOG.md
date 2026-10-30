# @quentinroy/snow

## 1.0.0

### Major Changes

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Sizes and speeds now use CSS pixels instead of canvas pixels, so snow looks the same at any canvas resolution. To keep the drawing sharp on high-resolution screens, set `canvas.width` and `canvas.height` to the displayed size multiplied by `window.devicePixelRatio`. If you previously compensated for the resolution in `meanSize` or `meanSpeed`, remove that adjustment.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Replace `flow` with `density`, the average number of snowflakes per 1,000 × 1,000 CSS pixels. With `flow`, the amount of visible snow changed with canvas size, speed, and direction, so the same value looked different across screens and settings. `density` sets the amount of snow directly. There is no exact conversion: replace `flow` with `density` and tune it to taste, starting from the default of `30`.

### Minor Changes

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Support horizontal and upward snowfall. `meanAngle` now accepts any direction.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Add the `autoFill` option, on by default. It fills the canvas with snow at startup and fills newly exposed areas after a resize. Set it to `false` to have snow enter only through the edges.

### Patch Changes

- [`56a26de`](https://github.com/QuentinRoy/snow/commit/56a26deb501be981daa6f679b3056ce4a4e2def0) - Fix empty areas in angled snowfall.

- [`339e86f`](https://github.com/QuentinRoy/snow/commit/339e86f7b07a8b140793ef7701da777ee87b0c77) - Reuse the canvas drawing context to reduce work each frame.

- [`ddb397b`](https://github.com/QuentinRoy/snow/commit/ddb397bc69407d955b546aa95d09a2f258fe6f9f) - Rename the factory to `snow` and call it as `snow(canvas, options)`, without `new`. Existing default imports keep working.

- [`604236f`](https://github.com/QuentinRoy/snow/commit/604236fb955bbd0fe7ea200d8fc2014b5775bdf9) - Reduce memory allocations when removing snowflakes that leave the canvas.

- [`59fa972`](https://github.com/QuentinRoy/snow/commit/59fa9726e66c607cab3cb827489304e2f42611a4) - Reduce the work needed to move snowflakes each frame.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Fix changing `color` recoloring every visible snowflake at once. Like size, speed, and direction, color changes now apply to new snowflakes only.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Fix overlapping translucent snowflakes not blending. Overlaps now look denser, as expected.

- [`54d31db`](https://github.com/QuentinRoy/snow/commit/54d31db0449104bdf2956d1402f0fb503701cc99) - Fix options passed when creating an animation being replaced with defaults. You no longer need to set those options again after creation.

- [`b7ca895`](https://github.com/QuentinRoy/snow/commit/b7ca895e4a97ef909eb7a14807d8bd98c1a566c7) - Fix sudden jumps and excessive snowfall when resuming after a pause or returning to an inactive tab.
