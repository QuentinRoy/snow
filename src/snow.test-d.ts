import { snow } from "@quentinroy/snow"
import { test } from "vite-plus/test"

declare const container: HTMLElement
declare const root: ShadowRoot

test("supports automatic disposal through the published declarations", () => {
  using animation = snow(container)

  animation.paused = true
})

test("accepts a shadow root through the published declarations", () => {
  using animation = snow(root, { paused: true })

  animation.density = 20
})
