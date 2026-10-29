# Snow

A small utility to simulate snow.

## Usage

```html
<canvas id="snow-canvas" />
```

```js
import snow from "@quentinroy/snow"

let canvas = document.querySelector("#snow-canvas")

// Optional argument. All options become mutable properties. Check sources
// for more information.
let options = {
  meanSize: 10,
  sdSize: 2,
  color: "rgba(255,255,255,0.9)",
  meanSpeed: 150,
  sdSpeed: 10,
  flow: 0.01,
  sdAngle: 5,
  isFpsShown: false,
}

// Create and start the snow animation.
let animation = snow(canvas, options)

// Stop the snow animation.
animation.stop()

// Resume the snow animation.
animation.resume()
```
