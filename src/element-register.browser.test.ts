import { expect, test } from "vite-plus/test"
import { SnowElement } from "./element.ts"

test("defining snow-fall registers the snow element", async () => {
  expect(customElements.get("snow-fall")).toBeUndefined()

  await import("./element-register.ts")

  expect(customElements.get("snow-fall")).toBe(SnowElement)
  expect(document.createElement("snow-fall")).toBeInstanceOf(SnowElement)
})
