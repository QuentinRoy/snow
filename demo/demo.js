import snow from "./snow.js"

const canvas = document.querySelector("#snow-canvas")

const resizeCanvas = () => {
  canvas.width = Math.round(canvas.clientWidth * window.devicePixelRatio)
  canvas.height = Math.round(canvas.clientHeight * window.devicePixelRatio)
}

resizeCanvas()

window.addEventListener("resize", resizeCanvas)

window.snow = snow(canvas)

const controls = document.querySelector("#controls")
const closeButton = controls.querySelector(".close-button")

const closeControls = () => {
  controls.classList.add("hidden")
}

const openControls = () => {
  controls.classList.remove("hidden")
}

const areControlsHidden = () => controls.classList.contains("hidden")

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
    case "color": {
      input.value = window.snow[input.id]
      input.addEventListener("change", () => {
        window.snow[input.id] = input.value
      })
      break
    }

    case "autoFill":
    case "isFpsShown": {
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
