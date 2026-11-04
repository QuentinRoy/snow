# Snow

Animated snowfall in the browser. Check the [demo](https://quentinroy.github.io/snow/)!

## Installation

```sh
npm install @quentinroy/snow
```

## Custom element

Add `<snow-fall>` to your HTML to get snow over its own area. First, import the registration module:

```js
import "@quentinroy/snow/element/register"
```

Then add the tag. A dark background helps the default white flakes stand out:

```html
<snow-fall width="800" height="400" density="60" style="background: #172033"></snow-fall>
```

The element defaults to 300 × 150 CSS pixels. `width` and `height` set its default size and aspect ratio. CSS can override either dimension; set just one and the other follows the ratio:

```html
<snow-fall width="800" height="400" style="width: 100%; background: #172033"></snow-fall>
```

Add `paused` to pause the animation, and remove it to continue.

The element complies with user preferences for reduced motion: the animation freezes automatically when the browser indicates reduced motion preference. You may disable this behavior by setting the `ignore-reduced-motion` attribute.

### Cover the page

Let it snow over the whole page while keeping the content underneath clickable:

```html
<snow-fall
  style="position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none"
></snow-fall>
```

Set both dimensions to fill the viewport regardless of the element's aspect ratio. The canvas lives in an open shadow root and is hidden from assistive technology.

### Without a bundler

Save this as an HTML file and open it in a browser:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Snow</title>
    <script
      type="module"
      src="https://unpkg.com/@quentinroy/snow@<version>/element/register"
    ></script>
  </head>
  <body style="background: #172033">
    <snow-fall width="800" height="400"></snow-fall>
  </body>
</html>
```

Replace `<version>` with the desired version number, such as `1.0.0`.

### Choose your own tag name

Import the class through the `element` module and register it under a different name:

```js
import { SnowElement } from "@quentinroy/snow/element"

customElements.define("falling-snow", SnowElement)
```

## The `snow()` function

The custom element wraps `snow()`. Call the function directly to draw snow over an existing container:

```html
<div
  id="snow-container"
  style="position: relative; width: 800px; height: 400px; background: #172033"
></div>
```

Run this after the container exists:

```js
import { snow } from "@quentinroy/snow"

const container = document.querySelector("#snow-container")
const animation = snow(container, { flakeColor: "white", density: 60 })
```

Snow creates a canvas that fills the container's padding box and leaves existing children in place. The container must be positioned and have a drawing area. Snow watches its container's size to match it anytime.

You may change Snow's settings through the returned snow animation object:

```js
animation.density = 90
animation.flakeSpeed = 200
animation.paused = true
```

Pass `paused: true` at creation to draw the first frame without starting playback.

The `snow()` function does not handle user preferences for reduced motion. Use the `paused` property to pause the animation when the browser indicates reduced motion preference.

Without a bundler, import `snow` from `https://unpkg.com/@quentinroy/snow@<version>` in a browser module, replacing `<version>` as above.

### Cleanup

Call `dispose()` when you're done, including before removing the container:

```js
animation.dispose()
```

This stops the animation, stops watching for size and resolution changes, and removes its canvas. Repeated calls and later changes to `paused` do nothing.

`snow()` also supports [explicit resource management](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Resource_management). If your environment supports it, you can also use `using` to automatically dispose of the animation at the end of a scope. For example:

```js
{
  using animation = snow(container)
  // Use the animation within this scope.
} // The animation is disposed here.
```

## Settings

Pass these as options to `snow()` or set them as properties on the animation or element. Element attributes use kebab-case: `flakeSize` becomes `flake-size`, for example. Properties and attributes stay in sync.

| Setting                   | Default                   | Meaning                                                                                            |
| ------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| `flakeSize`               | `10`                      | Average flake diameter, in CSS pixels.                                                             |
| `flakeSizeDeviation`      | `2`                       | Standard deviation of flake diameters.                                                             |
| `flakeSpeed`              | `150`                     | Average flake speed, in CSS pixels per second.                                                     |
| `flakeSpeedDeviation`     | `10`                      | Standard deviation of flake speeds.                                                                |
| `flakeDirection`          | `0`                       | Degrees from straight down: 90 is left, 180 is up, and −90 is right.                               |
| `flakeDirectionDeviation` | `5`                       | Standard deviation of flake directions, in degrees.                                                |
| `flakeColor`              | `"rgba(255,255,255,0.9)"` | Flake color as a CSS color string.                                                                 |
| `density`                 | `30`                      | Average number of flakes per 1,000 × 1,000 CSS pixels.                                             |
| `fillMode`                | `"instant"`               | `"instant"` fills the area at startup and after growth; `"none"` lets flakes enter from the edges. |
| `showFps`                 | `false`                   | Show the frame rate.                                                                               |
| `paused`                  | `false`                   | Pause on the current frame.                                                                        |
| `ignoreReducedMotion`     | `false`                   | Custom element only. Ignore the browser's reduced motion preference.                               |
| `width`                   | `300`                     | Custom element only. Default width, in CSS pixels. Sets the aspect ratio with `height`.            |
| `height`                  | `150`                     | Custom element only. Default height, in CSS pixels. Sets the aspect ratio with `width`.            |

Size, speed, and direction follow normal distributions: the deviation settings control how much flakes vary.

Size, speed, direction, and color changes affect new flakes, but existing flakes keep their settings until they leave.

`fillMode: "instant"` fills the area at startup and after growth, including while paused. With `"none"`, the scene starts empty and flakes drift in from the edges.

### Attribute values

Use numbers without units for numeric attributes. Missing or invalid values use defaults, and negative density reads as zero. HTML parsing can recover a leading number: `width="12em"` reads as `12`, without converting units. Dimension properties behave like canvas dimensions. Other numeric properties reject non-finite values with `TypeError`. The function API requires finite numeric settings and nonnegative density, throwing `RangeError` for invalid values.

Boolean attributes are true whenever present: `paused="false"` still pauses the snow. Remove the attribute or set the property to `false` to clear it. `fill-mode` is case-insensitive. Removing an attribute restores its default. Invalid values falls back to the default value.

## Development

Use [Vite+](https://viteplus.dev/guide/) and Node.js 24. `vp install` uses the pnpm version pinned in [`package.json`](package.json). After cloning the repository:

```sh
vp install --frozen-lockfile
vp exec playwright install chromium
vp pack
```

For the demo, run `vp pack --watch` and wait for the first build, then run `vp dev --open /demo/` in another terminal. Before submitting a change, run:

```sh
vp test --project core
vp test --project element
vp pack
vp test --project types
vp check
```
