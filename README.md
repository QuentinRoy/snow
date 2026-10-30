# Snow

A snow animation for the browser, drawn on a canvas. The package includes TypeScript declarations.

## Installation

Add Snow to your application:

```sh
npm install @quentinroy/snow
```

## Usage

Create a canvas with a width and height:

```html
<canvas id="snow-canvas" width="800" height="600"></canvas>
```

Run this code in the browser after the canvas exists, using your application's bundler:

```js
import snow from "@quentinroy/snow"

const canvas = document.querySelector("#snow-canvas")

// Create and start the snow animation.
const animation = snow(canvas, { color: "white", density: 30, autoFill: true })
```

The options argument is optional. Call `snow(canvas)` to use the defaults.

Snow measures the displayed canvas in CSS pixels and scales its drawing to the canvas resolution. Set `canvas.width` and `canvas.height` to the displayed size multiplied by `window.devicePixelRatio` to keep the drawing sharp on high-resolution screens. Snow uses a 2D canvas context and clears the canvas on every frame, so use a dedicated canvas for the animation. Update the CSS size, canvas resolution, and drawing together when resizing; call `animation.draw()` immediately after changing the canvas dimensions. The [demo](demo/demo.js) does this in its window resize handler to avoid stretching the previous frame.

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
    <canvas id="snow-canvas" width="800" height="600" style="background: #172033"></canvas>
    <script type="module">
      import snow from "https://cdn.jsdelivr.net/npm/@quentinroy/snow/dist/snow.js"

      const canvas = document.querySelector("#snow-canvas")
      const animation = snow(canvas)
    </script>
  </body>
</html>
```

The URL loads the latest published version. For production, [pin a version](https://github.com/jsdelivr/jsdelivr#npm) to avoid unexpected updates.

## Options

All options become mutable properties on the returned animation. Sizes and speeds use CSS pixels.

| Option       | Default                   | Meaning                                                                                          |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `meanSize`   | `10`                      | Average flake diameter, in pixels.                                                               |
| `sdSize`     | `2`                       | Standard deviation of flake diameters, in pixels.                                                |
| `color`      | `"rgba(255,255,255,0.9)"` | Flake color, as a CSS color string.                                                              |
| `meanSpeed`  | `150`                     | Average flake speed, in pixels per second.                                                       |
| `sdSpeed`    | `10`                      | Standard deviation of flake speeds, in pixels per second.                                        |
| `density`    | `30`                      | Target number of snowflakes per 1,000 × 1,000 CSS-pixel area.                                    |
| `autoFill`   | `true`                    | Immediately fill the canvas at startup and newly exposed areas after resizing.                   |
| `meanAngle`  | `0`                       | Average direction, in degrees from vertically downward: 90 is left, 180 is up, and -90 is right. |
| `sdAngle`    | `5`                       | Standard deviation of flake directions, in degrees.                                              |
| `isFpsShown` | `false`                   | Show the frame rate on the canvas.                                                               |

The population scales with displayed area: `density: 30` gives 30 flakes on a 1,000 × 1,000 canvas and 120 on a 2,000 × 2,000 canvas. Target counts are rounded to the nearest whole flake. Density must be finite and nonnegative. Increasing it lets additional flakes enter through the edges; decreasing it retires excess flakes as they leave. Setting it to `0` stops replacing flakes and lets the snow leave naturally.

Flakes recycle after leaving the canvas. While settings stay unchanged, each flake keeps its size, speed, direction, and color. Updated settings apply when a flake next enters, so visible flakes do not suddenly change. Size, speed, and direction are sampled from normal distributions. Negative sizes and speeds are clamped to zero: zero-size flakes are invisible, and zero-speed flakes stay still.

With `autoFill: true`, flakes cover the canvas before the first frame. Resizing preserves flakes in the overlapping area, removes flakes outside the new bounds, and fills newly exposed areas at the configured density. This also handles a canvas becoming wider and shorter at the same time. Shrinking can leave more flakes than the target count; excess flakes are removed as they leave the canvas, so visible flakes do not disappear to meet an exact count.

With `autoFill: false`, the canvas starts empty and snow enters through the incoming edges. Newly exposed areas after resizing fill through motion too. Slower flakes take longer to enter; stationary flakes remain hidden because they never cross an edge. Toggling `autoFill` affects future resize areas and does not reveal flakes already waiting to enter.

This replaces the previous `flow` option. There is no fixed conversion: `flow` controlled arrivals, so its visible population depended on canvas dimensions, speed, and direction. Use `density` to choose the amount of snow directly.

## Animation controls

```js
// Change the snowfall while it runs.
animation.density = 60
animation.meanSpeed = 200
animation.isFpsShown = true

// Pause, keeping the current frame visible.
animation.stop()

// Continue from the current flake positions.
animation.resume()
```

Size, speed, direction, and color changes apply to incoming flakes. Visible flakes keep their attributes until they leave. Density changes also settle through arrivals and departures, regardless of `autoFill`; changing a parameter never fills or clears the visible scene immediately. Stationary flakes stay where they are, including when density is set to `0`. The frame-rate display changes on the next draw.

`animation.draw()` applies option and layout changes, then redraws without advancing time. While stopped, call it after resizing to update coverage. You usually do not need to call it yourself. Call `animation.stop()` before removing the canvas to stop scheduling frames. To also erase the paused frame, clear the canvas yourself:

```js
animation.stop()
canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height)
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
