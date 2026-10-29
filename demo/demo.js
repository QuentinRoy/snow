import snow from "./snow.js"

const canvas = document.querySelector("#snow-canvas")

canvas.width = window.innerWidth

canvas.height = window.innerHeight

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
})

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
  // Make sure the control divs get the event *before* the open button.
  // Otherwise, after the button opens the controls, the controls div would
  // received this event and close it.
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
