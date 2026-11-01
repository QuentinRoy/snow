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

- [#5](https://github.com/QuentinRoy/snow/pull/5) [`b617ebe`](https://github.com/QuentinRoy/snow/commit/b617ebebe6218a88a5c60950040ae98c41a3e103) - Replace `stop()` and `resume()` with a settable `paused` property. Set `animation.paused = true` to pause and `animation.paused = false` to resume. Resuming continues from the same flake positions and ignores the time spent paused.
  
  Pass `paused: true` to `snow(container, { paused: true })` to draw the first frame and start without scheduling more.
  
  `stop()` and `resume()` are removed, with no aliases.

- [#6](https://github.com/QuentinRoy/snow/pull/6) [`241c98b`](https://github.com/QuentinRoy/snow/commit/241c98b0f29dfc6ef0efdda31db4242f0c0a957a) - `snow()` now accepts an HTML container instead of a canvas. Position the container with CSS (for example, `position: relative`) and give it a drawing area; Snow creates and owns a decorative canvas inside it. Replace `snow(canvas, options)` with `snow(container, options)`.
  
  Snow fills the container's padding box, including padding, without contributing to its layout size or changing its styles. Existing content or CSS layout can determine the container's size; explicit dimensions are optional. Snow warns if the container has `position: static`.
  
  Snow handles canvas sizing and screen-resolution changes automatically, including in vertical writing modes. Resizing keeps flakes at the same size and preserves those in the area the old and new sizes share. The drawing updates even while paused, and flakes do not stretch while waiting for a resize redraw. Remove code that sets the canvas's styles or bitmap dimensions.
  
  `draw()` is removed, with no alias. Snow redraws on its own after resizes, so delete any resize code that calls it.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Sizes and speeds now use CSS pixels instead of canvas pixels, so snow looks the same at any screen resolution. When migrating, remove any `devicePixelRatio` compensation from `flakeSize`, `flakeSizeDeviation`, `flakeSpeed`, and `flakeSpeedDeviation`. Snow handles the canvas resolution automatically.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Replace `flow` with `density`, the average number of snowflakes per 1,000 × 1,000 CSS pixels. With `flow`, the amount of visible snow changed with canvas size, speed, and direction, so the same value looked different across screens and settings. `density` sets the amount of snow directly. There is no exact conversion: replace `flow` with `density` and tune it to taste, starting from the default of `30`.

### Minor Changes

- [`56a26de`](https://github.com/QuentinRoy/snow/commit/56a26deb501be981daa6f679b3056ce4a4e2def0) - Use `flakeDirection` for horizontal and upward snowfall as well as downward snowfall.

- [#7](https://github.com/QuentinRoy/snow/pull/7) [`361c95a`](https://github.com/QuentinRoy/snow/commit/361c95ada7b105a876a5e0b83b95504e3001fe12) - Call `animation.dispose()` to stop the animation permanently and remove its canvas. Repeated calls, changes to `paused`, and resizes after disposal do nothing.
  
  Animations also support `using animation = snow(container)` for disposal at the end of a scope, including through the published TypeScript declarations. `[Symbol.dispose]()` does the same as `dispose()`. Importing Snow initializes `Symbol.dispose` globally when missing; your runtime must support `using` syntax, or your application must compile it.

- [#8](https://github.com/QuentinRoy/snow/pull/8) [`4fd4f2a`](https://github.com/QuentinRoy/snow/commit/4fd4f2a4a5f932936e9dd3153b1c231f241c2229) - Add the `<snow-fall>` custom element. Import `@quentinroy/snow/element/register` and write `<snow-fall flake-color="white" density="60"></snow-fall>` to get snow with no other setup. The element is 300 × 150 pixels by default, takes its default size and aspect ratio from `width` and `height`, and lets CSS override both, like an `<img>`.
  
  Every option is a live attribute in kebab-case, such as `flake-size` and `fill-mode`, and a property with the option's name. Numeric attributes follow HTML parsing rules, with invalid values falling back to defaults and negative density reading as zero. Numeric property assignments convert values like HTML properties; non-finite values throw for settings other than dimensions. `width` and `height` reflect like canvas dimensions. `fill-mode` matches without regard to ASCII letter case.
  
  The `flakeColor` property returns the default color when `flake-color` is absent. Removing the attribute restores that default; explicitly empty attributes remain empty.
  
  Add `paused` to freeze the snow, and remove it to continue. The element also stops when the system asks for reduced motion and resumes when that setting is turned off, without changing `paused`. Add `ignore-reduced-motion` to keep animating regardless; `paused` still wins. Taking the element out of the page stops its animation; putting it back continues with the same flakes, ignoring the time away.
  
  To pick your own tag name, import `SnowElement` from `@quentinroy/snow/element` and register it yourself. Both entry points need a browser, so import them from client code only.

### Patch Changes

- [`56a26de`](https://github.com/QuentinRoy/snow/commit/56a26deb501be981daa6f679b3056ce4a4e2def0) - Fix empty areas in angled snowfall.

- [#3](https://github.com/QuentinRoy/snow/pull/3) [`a917e3c`](https://github.com/QuentinRoy/snow/commit/a917e3c0b9fb37a42cd45ba0f667ca4f6f016788) - Reduce animation CPU use and memory allocations, particularly when many flakes leave the canvas.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Changing `flakeColor` now affects new snowflakes only, fixing color changes recoloring every visible flake at once. Existing flakes keep their color until they leave, as they already do for size, speed, and direction.

- [#2](https://github.com/QuentinRoy/snow/pull/2) [`ea97a19`](https://github.com/QuentinRoy/snow/commit/ea97a194e9b1e06d3966674764b3de20f911e3c5) - Fix overlapping translucent snowflakes not blending. Overlaps now look denser, as expected.

- [`54d31db`](https://github.com/QuentinRoy/snow/commit/54d31db0449104bdf2956d1402f0fb503701cc99) - Fix options passed when creating an animation being replaced with defaults. You no longer need to set those options again after creation.

- [`b7ca895`](https://github.com/QuentinRoy/snow/commit/b7ca895e4a97ef909eb7a14807d8bd98c1a566c7) - Fix sudden jumps and excessive snowfall when returning to an inactive tab.
