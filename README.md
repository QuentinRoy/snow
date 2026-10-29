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
const animation = snow(canvas, { color: "white", flow: 0.02 })
```

The options argument is optional. Call `snow(canvas)` to use the defaults.

Set `canvas.width` and `canvas.height` when the drawing area changes. CSS dimensions alone stretch the drawing without changing its resolution. Snow uses a 2D canvas context and clears the canvas on every frame, so use a dedicated canvas for the animation. See the [demo](demo/demo.js) for a canvas that resizes with the window.

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

All options become mutable properties on the returned animation. Sizes and speeds use canvas pixels.

| Option       | Default                   | Meaning                                                                                          |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `meanSize`   | `10`                      | Average flake diameter, in pixels.                                                               |
| `sdSize`     | `2`                       | Standard deviation of flake diameters, in pixels.                                                |
| `color`      | `"rgba(255,255,255,0.9)"` | Flake color, as a CSS color string.                                                              |
| `meanSpeed`  | `150`                     | Average flake speed, in pixels per second.                                                       |
| `sdSpeed`    | `10`                      | Standard deviation of flake speeds, in pixels per second.                                        |
| `flow`       | `0.01`                    | Creation rate. Higher values create more flakes; the rate scales with canvas width.              |
| `meanAngle`  | `0`                       | Average direction, in degrees from vertically downward: 90 is left, 180 is up, and -90 is right. |
| `sdAngle`    | `5`                       | Standard deviation of flake directions, in degrees.                                              |
| `isFpsShown` | `false`                   | Show the frame rate on the canvas.                                                               |

Size, speed, and direction are sampled from normal distributions. Flakes with a nonpositive size or speed are discarded. The creation rate is randomized, so `flow` does not specify an exact number of flakes per second.

Each flake enters from an edge it moves inward through, based on its own direction. Diagonal flakes can enter from either incoming edge, with the balance based on the edge lengths and the direction. Horizontal and upward motion are also supported. The creation rate stays tied to canvas width for every direction, so the number of visible flakes can change with direction.

## Animation controls

```js
// Change the snowfall while it runs.
animation.flow = 0.03
animation.meanSpeed = 200
animation.isFpsShown = true

// Pause, keeping the current frame visible.
animation.stop()

// Continue from the current flake positions.
animation.resume()
```

Changes to size, speed, and direction affect newly created flakes. `flow` controls subsequent flake creation, and `isFpsShown` affects the next draw. Changing `color` recolors all visible flakes once a new flake with that color appears.

`animation.draw()` redraws the current flakes without moving them. You usually do not need to call it yourself. Call `animation.stop()` before removing the canvas to stop scheduling frames. To also erase the paused frame, clear the canvas yourself:

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
