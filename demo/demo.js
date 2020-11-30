import Snow from "../dist/snow.js"

let canvas = document.querySelector("#snow-canvas")
canvas.width = window.innerWidth
canvas.height = window.innerHeight

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
})

window.snow = Snow(canvas)

let controls = document.querySelector("#controls")
let closeButton = controls.querySelector(".close-button")

function closeControls() {
  controls.classList.add("hidden")
}

function openControls() {
  controls.classList.remove("hidden")
}

function areControlsOpened() {
  return controls.classList.contains("hidden")
}

closeButton.addEventListener("click", () => {
  if (areControlsOpened()) {
    openControls()
  } else {
    closeControls()
  }
})

controls.addEventListener(
  "click",
  (evt) => {
    if (areControlsOpened()) {
      openControls()
      evt.stopPropagation()
    }
  },
  // Make sure the control divs get the event *before* the open button.
  // Otherwise, after the button opens the controls, the controls div would
  // received this event and close it.
  { capture: true }
)

document.querySelectorAll("#controls > .control > input").forEach((input) => {
  switch (input.id) {
    case "color":
      input.value = window.snow[input.id]
      input.addEventListener("change", () => {
        window.snow[input.id] = input.value
      })
      break
    case "isFpsShown":
      input.checked = window.snow[input.id]
      input.addEventListener("change", () => {
        window.snow[input.id] = input.checked
      })
      break
    default:
      input.value = window.snow[input.id]
      input.addEventListener("change", () => {
        window.snow[input.id] = +input.value
      })
      break
  }
})

setTimeout(closeControls, 500)
