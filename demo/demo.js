import { snow } from "./dist/snow.js"

const canvas = document.querySelector("#snow-canvas")

/** @type {import("../src/snow").SnowAnimation} */
const animation = snow(canvas)

window.snow = animation

const controls = document.querySelector("#controls")
const closeButton = controls.querySelector(".close-button")

function closeControls() {
  controls.classList.add("hidden")
}

function openControls() {
  controls.classList.remove("hidden")
}

function areControlsHidden() {
  return controls.classList.contains("hidden")
}

closeButton.addEventListener("click", () => {
  if (areControlsHidden()) {
    openControls()
  } else {
    closeControls()
  }
})

controls.addEventListener(
  "click",
  (event) => {
    if (areControlsHidden()) {
      openControls()
      event.stopPropagation()
    }
  },
  // Capture first so opening the controls does not immediately close them.
  { capture: true },
)

for (const input of document.querySelectorAll("#controls > .control > input")) {
  switch (input.id) {
    case "flakeColor": {
      input.value = window.snow[input.id]
      input.addEventListener("change", () => {
        window.snow[input.id] = input.value
      })
      break
    }

    case "fillMode": {
      input.checked = window.snow.fillMode === "instant"
      input.addEventListener("change", () => {
        window.snow.fillMode = input.checked === true ? "instant" : "none"
      })
      break
    }

    case "paused":
    case "showFps": {
      input.checked = window.snow[input.id]
      input.addEventListener("change", () => {
        window.snow[input.id] = input.checked
      })
      break
    }

    default: {
      input.value = window.snow[input.id]
      input.addEventListener("change", () => {
        window.snow[input.id] = +input.value
      })
      break
    }
  }
}

setTimeout(closeControls, 500)
