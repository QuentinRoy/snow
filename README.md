# Snow

A snow animation for the browser, drawn on a canvas. The package includes TypeScript declarations.

## Installation

Add Snow to your application:

```sh
npm install @quentinroy/snow
```

## Usage

Create a container and size it with CSS. Snow creates and owns its canvas:

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

Snow observes the container's content box with one `ResizeObserver`. It updates the canvas's CSS size, bitmap resolution, and drawing together, so resizing does not stretch the previous frame. This works for changes to any ancestor's layout, including while paused. Pixel density changes are handled too, including in vertical writing modes; browsers without device-pixel resize observation use a screen-resolution watcher.

Give the container its own width and height through CSS, layout, or `aspect-ratio`. The canvas is absolutely positioned and does not contribute to the container's size. Snow sets `position: relative` on a statically positioned container and restores the previous inline value on disposal, unless your code has since changed it. Existing children are preserved; the decorative canvas ignores pointer events. Do not style or resize that canvas yourself.

Flakes in the area the old and new sizes share stay put. With `fillMode: "instant"`, Snow fills newly exposed space at once; with `"none"`, it stays empty until flakes drift in.

For migration to 1.0, replace the canvas passed to `snow()` with a sized container. Canvas inputs are rejected; Snow now creates and removes the canvas itself.

## Without a bundler

Load Snow directly from jsDelivr using a browser module. Save this as an HTML file and open it in a browser:

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

## Options

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

## Animation controls

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

Call `dispose()` when you no longer need the animation, for example before removing the container. It cancels the scheduled frame, stops watching the container, and removes its canvas. After that, a second `dispose()`, changing `paused`, and resizing the container do nothing.

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

Run commands from the repository root. The library source is in [`src/snow.ts`](src/snow.ts), its tests are in [`src/snow.test.js`](src/snow.test.js), and the interactive demo is in [`demo/`](demo/).

To work on the demo, start the library build in one terminal:

```sh
vp pack --watch
```

Wait for the first build to finish, then start the demo server in a second terminal:

```sh
vp dev --open /demo/
```

The demo loads the built library from `dist/`. The build watcher rebuilds it when the source changes. If you start the server before the first build finishes and see an import error, restart the server after the build completes.

| Command           | Purpose                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `vp check`        | Check formatting, lint rules, and TypeScript types.                         |
| `vp lint`         | Run the linter, including type checks.                                      |
| `vp fmt`          | Format the repository's files.                                              |
| `vp test`         | Run the tests once.                                                         |
| `vp test --watch` | Rerun tests as files change.                                                |
| `vp pack`         | Build the library and TypeScript declarations in `dist/`, with source maps. |

Before submitting a change, run:

```sh
vp test
vp pack
vp check
```
