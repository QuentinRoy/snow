import { expect, test } from "vite-plus/test"

test("registering snow-fall throws when another class already owns the name", async () => {
  class Other extends HTMLElement {}

  customElements.define("snow-fall", Other)

  await expect(import("./element-register")).rejects.toThrow()
  expect(customElements.get("snow-fall")).toBe(Other)
})
