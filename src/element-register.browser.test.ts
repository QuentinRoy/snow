import { expect, test } from "vite-plus/test"
import { SnowElement } from "./element"

test("defining snow-fall registers the snow element", async () => {
  expect(customElements.get("snow-fall")).toBeUndefined()

  await import("./element-register")

  expect(customElements.get("snow-fall")).toBe(SnowElement)
  expect(document.createElement("snow-fall")).toBeInstanceOf(SnowElement)
})
