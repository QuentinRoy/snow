import snow from "./snow.js"

const canvas = document.querySelector("#snow-canvas")

const resizeCanvas = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  // Keep the previous bitmap at its drawn size until the replacement is ready.
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.width = Math.round(width * window.devicePixelRatio)
  canvas.height = Math.round(height * window.devicePixelRatio)
}

resizeCanvas()

/** @type {ReturnType<typeof import("../src/snow").default>} */
const animation = snow(canvas)

window.snow = animation

window.addEventListener("resize", () => {
  resizeCanvas()
  animation.draw()
})

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
