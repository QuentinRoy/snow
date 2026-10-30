# Snow

A snow animation for the browser, drawn on a canvas. Use it as a `<snow-fall>` element, or call the `snow()` function on a canvas you manage yourself. The package includes TypeScript declarations.

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

Use the function when you want to manage the canvas yourself. Create a canvas and size it with CSS:

```html
<canvas id="snow-canvas" style="width: 800px; height: 600px"></canvas>
```

Run this code in the browser after the canvas exists, using your application's bundler:

```js
import { snow } from "@quentinroy/snow"

const canvas = document.querySelector("#snow-canvas")

// Create and start the snow animation.
const animation = snow(canvas, { flakeColor: "white", density: 30, fillMode: "instant" })
```

The options argument is optional. Call `snow(canvas)` to use the defaults.

Snow watches the canvas and sets `canvas.width` and `canvas.height` to the displayed size multiplied by `window.devicePixelRatio`, so the drawing stays sharp on high-resolution screens, including in vertical writing modes. Snow also updates the bitmap when pixel density changes, including while paused. In browsers without device-pixel resize observation, it watches the screen resolution for changes. Don't set them yourself; size the canvas with CSS only. After every resize Snow redraws the frame, even while the animation is paused. Flakes in the area the old and new sizes share stay put. With `fillMode: "instant"`, Snow fills the new area at once; with `"none"`, the new area stays empty until flakes drift in. Snow uses a 2D canvas context and clears the canvas on every frame, so use a dedicated canvas for the animation.

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
    <canvas id="snow-canvas" style="width: 800px; height: 600px; background: #172033"></canvas>
    <script type="module">
      import { snow } from "https://cdn.jsdelivr.net/npm/@quentinroy/snow/dist/snow.js"

      const canvas = document.querySelector("#snow-canvas")
      const animation = snow(canvas)
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

Call `dispose()` when you no longer need the animation, for example before removing the canvas. It cancels the scheduled frame, stops watching the canvas, and clears it. After that, a second `dispose()`, changing `paused`, and resizing the canvas do nothing.

```js
animation.dispose()
```

Declare the animation with `using` and it disposes itself when the scope ends. `[Symbol.dispose]` does the same as `dispose()`. When `Symbol.dispose` is missing, importing Snow initializes it globally. This does not add support for `using` syntax: your runtime must support it, or your application must compile it.

```js
{
  using animation = snow(canvas)
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

Run commands from the repository root. The core is in [`src/snow.ts`](src/snow.ts) with tests in [`src/snow.test.js`](src/snow.test.js), which run in Node. The element is in [`src/element.ts`](src/element.ts) with tests in `src/*.browser.test.ts`, which run in Chromium through Playwright. Install the browser once with `vp exec playwright install chromium`. Continuous integration runs them in Playwright's container image instead, so its tag must match the pinned `playwright` version. The interactive demo is in [`demo/`](demo/).

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
