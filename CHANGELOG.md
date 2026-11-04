# @quentinroy/snow

## 1.0.0

### Major Changes

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Snow now starts with a filled canvas and fills newly exposed areas after a resize, so snow is visible immediately. The new `fillMode` option defaults to `"instant"`. Set `fillMode: "none"` to keep the previous behavior of flakes entering only through the edges.

- [#10](https://github.com/QuentinRoy/snow/pull/10) [`f6cbfa8`](https://github.com/QuentinRoy/snow/commit/f6cbfa8484c0d4da3a04fe9e96637846e52a0bfd) - Published JavaScript now targets ES2022 instead of ES2020. Use a browser with ES2022 support, or configure your build to transpile `@quentinroy/snow` for older browsers.

- [#4](https://github.com/QuentinRoy/snow/pull/4) [`3c5ff43`](https://github.com/QuentinRoy/snow/commit/3c5ff4396a8d833ac73e5eb2e4bc77cee623c373) - Import `snow` by name: `import { snow } from "@quentinroy/snow"`. The factory and its settings have new names to make the API consistent. The default export is gone, and there are no aliases for the old option names. The `SnowAnimation` and `SnowSettings` types are now exported.

  Use the package entry points instead of imports through `@quentinroy/snow/dist/...`; package imports now expose only `@quentinroy/snow`, `@quentinroy/snow/element`, and `@quentinroy/snow/element/register`.

  Rename these options:

  - `meanSize` to `flakeSize`
  - `sdSize` to `flakeSizeDeviation`
  - `meanSpeed` to `flakeSpeed`
  - `sdSpeed` to `flakeSpeedDeviation`
  - `meanAngle` to `flakeDirection`
  - `sdAngle` to `flakeDirectionDeviation`
  - `color` to `flakeColor`
  - `isFpsShown` to `showFps`

- [#5](https://github.com/QuentinRoy/snow/pull/5) [`b617ebe`](https://github.com/QuentinRoy/snow/commit/b617ebebe6218a88a5c60950040ae98c41a3e103) - Replace `stop()` and `resume()` with a settable `paused` property: set `animation.paused = true` to pause and `animation.paused = false` to resume from where the flakes were. Pass `{ paused: true }` to `snow()` to start paused with the first frame drawn.

- [#6](https://github.com/QuentinRoy/snow/pull/6) [`241c98b`](https://github.com/QuentinRoy/snow/commit/241c98b0f29dfc6ef0efdda31db4242f0c0a957a) - `snow()` now takes an HTML container instead of a canvas, so Snow can size its own canvas. Replace `snow(canvas, options)` with `snow(container, options)`, and give the container a position other than `static` (for example, `position: relative`); Snow warns otherwise. Snow fills the container's padding box without changing its layout.

  Snow keeps the canvas sized and sharp when the container or screen resolution changes, and keeps flakes that stay in view. Remove code that sets the canvas size, and calls to `draw()`, which is removed.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Sizes and speeds now use CSS pixels instead of canvas pixels, so snow looks the same at any screen resolution. Remove any `devicePixelRatio` compensation from `flakeSize`, `flakeSizeDeviation`, `flakeSpeed`, and `flakeSpeedDeviation`.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Replace `flow` with `density`, the average number of flakes per 1,000 × 1,000 CSS pixels. The amount of snow `flow` produced changed with canvas size, speed, and direction; `density` looks the same everywhere. There is no exact conversion, so start from the default of `30` and tune.

### Minor Changes

- [`56a26de`](https://github.com/QuentinRoy/snow/commit/56a26deb501be981daa6f679b3056ce4a4e2def0) - Use `flakeDirection` for horizontal and upward snowfall as well as downward snowfall.

- [#7](https://github.com/QuentinRoy/snow/pull/7) [`361c95a`](https://github.com/QuentinRoy/snow/commit/361c95ada7b105a876a5e0b83b95504e3001fe12) - Call `animation.dispose()` to stop the animation for good and remove its canvas. Animations also work with `using animation = snow(container)`, which disposes them at the end of the scope; your runtime or compiler must support `using`. Snow defines `Symbol.dispose` if your runtime lacks it.

- [#8](https://github.com/QuentinRoy/snow/pull/8) [`4fd4f2a`](https://github.com/QuentinRoy/snow/commit/4fd4f2a4a5f932936e9dd3153b1c231f241c2229) - Add the `<snow-fall>` custom element. Import `@quentinroy/snow/element/register` and write `<snow-fall></snow-fall>` to get snow with no other setup. Like an `<img>`, the element takes its default size from `width` and `height` (300 × 150 if absent), and CSS can override it.

  Every option is a live kebab-case attribute, such as `flake-size` or `fill-mode`, and a property with the option's name. Invalid attribute values fall back to defaults.

  Add `paused` to freeze the snow. The element also pauses when the system asks for reduced motion, unless you add `ignore-reduced-motion`. Taking the element out of the page stops its animation, and putting it back continues with the same flakes.

  To pick your own tag name, import `SnowElement` from `@quentinroy/snow/element` and register it yourself. Both entry points need a browser, so import them from client code only.

### Patch Changes

- [`56a26de`](https://github.com/QuentinRoy/snow/commit/56a26deb501be981daa6f679b3056ce4a4e2def0) - Fix empty areas in angled snowfall.

- [#3](https://github.com/QuentinRoy/snow/pull/3) [`a917e3c`](https://github.com/QuentinRoy/snow/commit/a917e3c0b9fb37a42cd45ba0f667ca4f6f016788) - Reduce animation CPU use and memory allocations, particularly when many flakes leave the canvas.

- [`d2093c8`](https://github.com/QuentinRoy/snow/commit/d2093c8affe8c0bcf8f016b784202de81763829f) - Switch from the MIT license to the [Blue Oak Model License 1.0.0](https://blueoakcouncil.org/license/1.0.0).

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Changing `flakeColor` now affects new snowflakes only, fixing color changes recoloring every visible flake at once. Existing flakes keep their color until they leave, as they already do for size, speed, and direction.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Fix overlapping translucent snowflakes not blending. Overlaps now look denser, as expected.

- [`54d31db`](https://github.com/QuentinRoy/snow/commit/54d31db0449104bdf2956d1402f0fb503701cc99) - Fix options passed when creating an animation being replaced with defaults. You no longer need to set those options again after creation.

- [`b7ca895`](https://github.com/QuentinRoy/snow/commit/b7ca895e4a97ef909eb7a14807d8bd98c1a566c7) - Fix sudden jumps and excessive snowfall when returning to an inactive tab.
