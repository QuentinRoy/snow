import "./dist/element/register.js"

/** @type {import("../src/element.ts").SnowElement} */
const snowfall = document.querySelector("snow-fall")

window.snow = snowfall

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
      input.value = snowfall.flakeColor
      input.addEventListener("change", () => {
        snowfall.flakeColor = input.value
      })
      break
    }

    case "fillMode": {
      input.checked = snowfall.fillMode === "instant"
      input.addEventListener("change", () => {
        snowfall.fillMode = input.checked === true ? "instant" : "none"
      })
      break
    }

    case "paused":
    case "showFps": {
      input.checked = snowfall[input.id]
      input.addEventListener("change", () => {
        snowfall[input.id] = input.checked
      })
      break
    }

    default: {
      input.value = snowfall[input.id]
      input.addEventListener("change", () => {
        snowfall[input.id] = Number(input.value)
      })
      break
    }
  }
}

setTimeout(closeControls, 500)
