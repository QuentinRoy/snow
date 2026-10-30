import { snow } from "./dist/snow.js"

const canvas = document.querySelector("#snow-canvas")

/** @type {import("../src/snow").SnowAnimation} */
const animation = snow(canvas)

window.snow = animation

const controls = document.querySelector("#controls")

function closeControls() {
  controls.classList.add("hidden")
}

controls.querySelector(".close-button").addEventListener("click", closeControls)

controls.addEventListener(
  "click",
  (event) => {
    if (controls.classList.contains("hidden")) {
      controls.classList.remove("hidden")
      event.stopPropagation()
    }
  },
  // Capture first so a click on the hidden controls only opens them, even on the close button.
  { capture: true },
)

for (const input of document.querySelectorAll("#controls > .control > input")) {
  switch (input.id) {
    case "flakeColor": {
      input.value = animation.flakeColor
      input.addEventListener("change", () => {
        animation.flakeColor = input.value
      })
      break
    }

    case "fillMode": {
      input.checked = animation.fillMode === "instant"
      input.addEventListener("change", () => {
        animation.fillMode = input.checked === true ? "instant" : "none"
      })
      break
    }

    case "paused":
    case "showFps": {
      input.checked = animation[input.id]
      input.addEventListener("change", () => {
        animation[input.id] = input.checked
      })
      break
    }

    default: {
      input.value = animation[input.id]
      input.addEventListener("change", () => {
        animation[input.id] = Number(input.value)
      })
      break
    }
  }
}

setTimeout(closeControls, 500)
