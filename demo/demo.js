/** @type {import("../src/element.ts").SnowElement} */
const snowfall = document.querySelector("snow-fall")
const controls = document.querySelector("#controls")

// Settings live in the query string so a shared URL reproduces the same snowfall.
const params = new URLSearchParams(location.search)

// Set as attributes before the element upgrades, otherwise it fills the canvas with defaults first.
for (const input of document.querySelectorAll("#controls > .control > input")) {
  const { id } = input
  let value = params.get(id)

  if (value === null) {
    continue
  }

  // fillMode is a checkbox in the UI, so also accept boolean values for it.
  if (id === "fillMode") {
    if (value === "false") {
      value = "none"
    } else if (value === "true") {
      value = "instant"
    }
  } else if (value === "false") {
    continue
  } else if (value === "true") {
    value = ""
  }

  snowfall.setAttribute(
    id.replaceAll(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`),
    value,
  )
}

await import("./snow/element/register.js")

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
  const { id } = input
  const isCheckbox = input.type === "checkbox"

  if (id === "fillMode") {
    input.checked = snowfall.fillMode === "instant"
  } else if (isCheckbox) {
    input.checked = snowfall[id]
  } else {
    input.value = snowfall[id]
  }

  input.addEventListener("change", () => {
    if (id === "fillMode") {
      snowfall.fillMode = input.checked === true ? "instant" : "none"
    } else if (isCheckbox) {
      snowfall[id] = input.checked
    } else if (input.type === "number") {
      snowfall[id] = Number(input.value)
    } else {
      snowfall[id] = input.value
    }

    params.set(id, String(snowfall[id]))
    history.replaceState(null, "", `?${params}`)
  })
}

setTimeout(closeControls, 500)
