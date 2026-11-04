/** @type {import("../src/element.ts").SnowElement} */
const snowfall = document.querySelector("snow-fall")
const controls = document.querySelector("#controls")

// Settings live in the query string so a shared URL reproduces the same snowfall.
const params = new URLSearchParams(location.search)

// snowInFront is a demo-only setting, not a snow-fall property.
const settingInputs = "#controls > .control > input:not(#snowInFront)"

// Set as attributes before the element upgrades, otherwise it fills the canvas with defaults first.
for (const input of document.querySelectorAll(settingInputs)) {
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

// Inputs apply on change, so pressing Enter must not reload the page.
controls.addEventListener("submit", (event) => {
  event.preventDefault()
})

for (const input of document.querySelectorAll(settingInputs)) {
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

// The page CSS does the layering, snow-fall itself has no such option.
/** @type {HTMLInputElement} */
const snowInFront = document.querySelector("#snowInFront")

snowInFront.checked = params.get("snowInFront") === "true"

snowfall.toggleAttribute("data-in-front", snowInFront.checked)

snowInFront.addEventListener("change", () => {
  snowfall.toggleAttribute("data-in-front", snowInFront.checked)
  params.set("snowInFront", String(snowInFront.checked))
  history.replaceState(null, "", `?${params}`)
})
