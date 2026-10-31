# Snow

A snow animation for the browser, drawn on a canvas. Use it as a `<snow-fall>` element, or call the `snow()` function on a container sized with CSS. The package includes TypeScript declarations.

## Installation

Add Snow to your application:

```sh
npm install @quentinroy/snow
```

## The `<snow-fall>` element

Import the registration module once, then write the tag:

```js
import "@quentinroy/snow/element/register"
```

```html
<snow-fall flake-color="white" density="60"></snow-fall>
```

The element draws snow over its own area. It is 300 × 150 pixels unless you say otherwise.

The element entry points need a browser. Import them from client code only, not from code that runs on a server.

### Without a bundler

Load the registration module from jsDelivr as a browser module. Save this as an HTML file and open it in a browser:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Snow</title>
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@quentinroy/snow/dist/element/register.js"
    ></script>
  </head>
  <body style="background: #172033">
    <snow-fall width="800" height="600" flake-color="white"></snow-fall>
  </body>
</html>
```

The URL loads the latest published version. For production, [pin a version](https://github.com/jsdelivr/jsdelivr#npm) to avoid unexpected updates.

### Your own tag name

The registration module defines `snow-fall` and throws if another class already uses that name. To pick a different name, or to use a scoped registry, import the class and register it yourself:

```js
import { SnowElement } from "@quentinroy/snow/element"

customElements.define("falling-snow", SnowElement)
```

### Attributes and properties

Every attribute has a property with the matching camel-case name, such as `flake-speed-deviation` and `flakeSpeedDeviation`. The two stay in sync, and changes apply while the snow falls. Sizes and speeds use CSS pixels.

| Attribute                   | Default                   | Meaning                                                                                    |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| `flake-size`                | `10`                      | Average flake diameter.                                                                    |
| `flake-size-deviation`      | `2`                       | Standard deviation of flake diameters.                                                     |
| `flake-speed`               | `150`                     | Average flake speed, in pixels per second.                                                 |
| `flake-speed-deviation`     | `10`                      | Standard deviation of flake speeds.                                                        |
| `flake-direction`           | `0`                       | Average direction, in degrees from straight down: 90 is left, 180 is up, and -90 is right. |
| `flake-direction-deviation` | `5`                       | Standard deviation of flake directions, in degrees.                                        |
| `flake-color`               | `"rgba(255,255,255,0.9)"` | Flake color, as a CSS color string.                                                        |
| `density`                   | `30`                      | Target number of flakes per 1,000 × 1,000 pixel area.                                      |
| `fill-mode`                 | `"instant"`               | `"instant"` fills empty space at once. `"none"` lets flakes drift in from the edges.       |
| `paused`                    | absent                    | Stop the animation while keeping the current frame. Present means paused.                  |
| `ignore-reduced-motion`     | absent                    | Keep animating when the system asks for reduced motion. Present means on.                  |
| `show-fps`                  | absent                    | Show the frame rate. Present means on.                                                     |
| `width`                     | `300`                     | Default width, and half of the default aspect ratio. See [Sizing](#sizing).                |
| `height`                    | `150`                     | Default height, and the other half of the default aspect ratio. See [Sizing](#sizing).     |

Write numeric attributes using HTML's [valid number syntax](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#numbers): non-negative integers for dimensions and floating-point numbers for the other settings. Units are not supported. The HTML parsing rules recover a leading number from some invalid text: for example, `width="12px"` reads as `12`, without converting units. Blank, unparseable, or overflowing values use the default. Zero is valid. A negative density reads as zero; negative or out-of-range dimensions use their defaults. Reading a property leaves the original attribute text unchanged.

Property assignments follow [Web IDL conversion](https://webidl.spec.whatwg.org/#es-type-mapping) before reflection. Dimensions use unsigned-long conversion and the same range and defaults as canvas dimensions: fractions truncate, large values wrap modulo 2³², and values above 2³¹−1 use the default. Other numeric properties accept finite doubles and throw `TypeError` for non-finite values, leaving the attribute unchanged. Numeric strings and `null` are converted; `undefined`, BigInts, and symbols throw for doubles. Density's lower bound is Snow's own policy; assigning a finite negative value preserves it in the attribute while the property reads as zero.

`fill-mode` matches `instant` and `none` without regard to ASCII letter case; whitespace and unknown values select `instant`. String properties use DOMString conversion. Missing `flake-color` reads as an empty string, while the animation uses its default color; an explicitly empty attribute is distinct. Boolean attributes are true whenever present, even with the value `"false"`; property assignments use JavaScript truthiness. Removing an attribute restores its missing-value behavior. These reflection rules follow [HTML](https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#reflect), with Snow's stated defaults and density bound.

Size, speed, direction, and color changes apply to flakes that arrive afterward. Flakes already on screen keep their look until they leave.

### Pausing and reduced motion

Add `paused` to freeze the snow on its current frame, and remove it to continue from there. The `paused` property does the same: `element.paused = true` adds the attribute and `false` removes it.

```html
<snow-fall paused></snow-fall>
```

The element also stops when the system asks for reduced motion, and starts again as soon as that setting is turned off. This doesn't change `paused`, which always reflects what you set. Add `ignore-reduced-motion` (or set `ignoreReducedMotion`) to keep the snow falling in spite of the setting. `paused` still wins: a paused element stays still.

Taking the element out of the page stops its animation. Putting it back continues with the same flakes, and the time it spent away doesn't move them.

### Sizing

Size the element the way you would an `<img>`. The `width` and `height` attributes set its default size and aspect ratio, and CSS overrides them:

```html
<snow-fall width="800" height="400"></snow-fall>

<!-- 600 pixels wide and 300 pixels tall: CSS wins, and the ratio still follows 2:1. -->
<snow-fall width="800" height="400" style="width: 600px"></snow-fall>
```

Size one dimension in CSS and the other follows the aspect ratio. The `width` and `height` properties return the attribute values. To read the displayed size, measure the element, for example with `getBoundingClientRect()`.

The element is `display: inline-block`. The snow follows the displayed size, so a wider element shows a wider area of snow, not larger flakes. The canvas stays sharp on high-density screens and when you move the window between screens.

### Fullscreen overlay

Cover the page with snow that lets clicks through:

```html
<snow-fall
  style="position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none"
></snow-fall>
```

The element receives pointer events like an `<img>` or `<canvas>` does, so `pointer-events: none` is what lets the page underneath stay clickable. The `width` and `height` are there because the element keeps its aspect ratio, which would otherwise shrink its height when `inset` stretches the width.

The canvas lives in an open shadow root and is hidden from assistive technology.

## The `snow()` function

Use the function with a container sized by your CSS. Snow creates and owns its canvas:

```html
<div id="snow-container" style="width: 800px; height: 600px"></div>
```

Run this code in the browser after the container exists, using your application's bundler:

```js
import { snow } from "@quentinroy/snow"

const container = document.querySelector("#snow-container")

// Create and start the snow animation.
const animation = snow(container, { flakeColor: "white", density: 30, fillMode: "instant" })
```

The options argument is optional. Call `snow(container)` to use the defaults.

Snow fills the container's padding box: everything inside the border, including padding. It observes its own canvas with one `ResizeObserver` and redraws after size changes, including while paused. Its responsive CSS keeps the previous bitmap unscaled until redraw, so resizing does not stretch the flakes. A screen-resolution watcher updates the drawing when pixel density changes, including in vertical writing modes.

Snow sets `position: relative` on static containers and preserves other positioning. When the last animation is disposed, it restores the previous inline position unless your code has changed it. Its absolutely positioned canvas adds no layout height, so the container gets its size from existing content, CSS layout, dimensions, or `aspect-ratio`. Explicit width and height are optional when layout already provides a drawing area. An empty container with no height or padding has no visible snow area. Existing children are preserved, and the decorative canvas ignores pointer events. Use the container's `overflow` when you want clipping to rounded corners. Leave the owned canvas's styles and bitmap dimensions to Snow.

Flakes in the area the old and new sizes share stay put. With `fillMode: "instant"`, Snow fills newly exposed space at once; with `"none"`, it stays empty until flakes drift in.

For migration to 1.0, replace the canvas passed to `snow()` with a container that supplies a drawing area. Canvas inputs are rejected; Snow now creates and removes the canvas itself.

### Without a bundler

Load `snow()` directly from jsDelivr using a browser module. Save this as an HTML file and open it in a browser:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Snow</title>
  </head>
  <body>
    <div id="snow-container" style="width: 800px; height: 600px; background: #172033"></div>
    <script type="module">
      import { snow } from "https://cdn.jsdelivr.net/npm/@quentinroy/snow/dist/snow.js"

      const container = document.querySelector("#snow-container")
      const animation = snow(container)
    </script>
  </body>
</html>
```

The URL loads the latest published version. For production, [pin a version](https://github.com/jsdelivr/jsdelivr#npm) to avoid unexpected updates.

### Options

All options become mutable properties on the returned animation. Sizes and speeds use CSS pixels.

| Option                    | Default                   | Meaning                                                                                                |
| ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `flakeSize`               | `10`                      | Average flake diameter, in pixels.                                                                     |
| `flakeSizeDeviation`      | `2`                       | Standard deviation of flake diameters, in pixels.                                                      |
| `flakeSpeed`              | `150`                     | Average flake speed, in pixels per second.                                                             |
| `flakeSpeedDeviation`     | `10`                      | Standard deviation of flake speeds, in pixels per second.                                              |
| `flakeDirection`          | `0`                       | Average direction, in degrees from vertically downward: 90 is left, 180 is up, and -90 is right.       |
| `flakeDirectionDeviation` | `5`                       | Standard deviation of flake directions, in degrees.                                                    |
| `flakeColor`              | `"rgba(255,255,255,0.9)"` | Flake color, as a CSS color string.                                                                    |
| `density`                 | `30`                      | Target number of snowflakes per 1,000 × 1,000 CSS-pixel area.                                          |
| `fillMode`                | `"instant"`               | `"instant"` fills the canvas at startup and newly exposed areas after resizing. `"none"` does not.     |
| `showFps`                 | `false`                   | Show the frame rate on the canvas.                                                                     |
| `paused`                  | `false`                   | Start without scheduling frames. Snow still draws the first frame. Change it later to pause or resume. |

Density describes average coverage: `density: 30` gives an average of 30 flakes on a 1,000 × 1,000 canvas and 120 on a 2,000 × 2,000 canvas. The visible count fluctuates naturally. Density must be finite and nonnegative. Increasing it increases incoming snowfall; decreasing it reduces new arrivals while existing flakes leave. Setting it to `0` stops arrivals and lets the snow leave naturally.

Size, speed, and direction are sampled from normal distributions. The speed and direction options describe the intended on-screen mix. Faster flakes arrive more often because they leave sooner, so slow flakes do not accumulate disproportionately. Negative sizes and speeds are clamped to zero: zero-size flakes are invisible, and zero-speed flakes stay still. Size, speed, and direction settings must be finite numbers.

With `fillMode: "instant"`, flakes cover the canvas before the first frame. Initial counts are rounded to whole flakes. Resizing preserves flakes in the overlapping area, removes flakes outside the new bounds, and fills newly exposed areas at the configured density. This also handles a canvas becoming wider and shorter at the same time. Existing flakes continue naturally after shrinking, even if the population temporarily exceeds the new average.

With `fillMode: "none"`, the canvas starts empty and flakes arrive through incoming edges at independently randomized times. Slower snow takes longer to establish coverage. Stationary flakes cannot enter through an edge; they appear only through the `"instant"` fill mode. Changing `fillMode` affects future resize areas and does not fill the existing scene.

### Animation controls

```js
// Change the snowfall while it runs.
animation.density = 60
animation.flakeSpeed = 200
animation.showFps = true

// Pause, keeping the current frame visible.
animation.paused = true

// Continue from the current flake positions. Time spent paused is ignored.
animation.paused = false
```

Size, speed, direction, and color changes apply to new arrivals. Visible flakes keep their attributes until they leave. Arrival timing is independent of departures: reducing density does not pause arrivals until the count falls below a quota. Changing a parameter never fills or clears the visible scene immediately, regardless of `fillMode`. Stationary flakes stay where they are, including when density is set to `0`. The frame-rate display changes on the next frame.

## Stopping for good

Call `dispose()` when you no longer need the animation, for example before removing the container. It cancels the scheduled frame, stops observation, removes its canvas, and releases automatic positioning. After that, a second `dispose()`, changing `paused`, and resizing the container do nothing.

```js
animation.dispose()
```

Declare the animation with `using` and it disposes itself when the scope ends. `[Symbol.dispose]` does the same as `dispose()`. When `Symbol.dispose` is missing, importing Snow initializes it globally. This does not add support for `using` syntax: your runtime must support it, or your application must compile it.

```js
{
  using animation = snow(container)
  // ...
} // Disposed here.
```

## Development

Use [Vite+](https://viteplus.dev/guide/) for the commands below. Node.js 24.11 or later in the 24.x series is recommended; continuous integration uses Node.js 24. The repository pins pnpm 10.34.7, which `vp install` uses to install dependencies.

```sh
git clone https://github.com/QuentinRoy/snow.git
cd snow
vp install
```

Run commands from the repository root. The core is in [`src/snow.ts`](src/snow.ts) with tests in [`src/snow.test.js`](src/snow.test.js), which run in Node. The element is in [`src/element.ts`](src/element.ts) with tests in `src/**/*.browser.test.ts`, which run in Chromium through Playwright. Install the browser once with `vp exec playwright install chromium`. Continuous integration runs them in Playwright's container image instead, so its tag must match the pinned `playwright` version. The interactive demo is in [`demo/`](demo/).

To work on the demo, start the library build in one terminal:

```sh
vp pack --watch
```

Wait for the first build to finish, then start the demo server in a second terminal:

```sh
vp dev --open /demo/
```

The demo loads the built library from `dist/`. The build watcher rebuilds it when the source changes. If you start the server before the first build finishes and see an import error, restart the server after the build completes.

| Command             | Purpose                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `vp check`          | Check formatting, lint rules, and TypeScript types.                         |
| `vp lint`           | Run the linter, including type checks.                                      |
| `vp fmt`            | Format the repository's files.                                              |
| `pnpm test`         | Run the core tests once, in Node.                                           |
| `pnpm test:browser` | Run the element tests once, in Chromium.                                    |
| `pnpm test:types`   | Check the built declarations with Vitest type tests; run after `vp pack`.   |
| `vp pack`           | Build the library and TypeScript declarations in `dist/`, with source maps. |

Before submitting a change, run:

```sh
pnpm test
pnpm test:browser
vp pack
pnpm test:types
vp check
```
