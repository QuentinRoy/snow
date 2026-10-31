import { snow } from "@quentinroy/snow"
import { test } from "vite-plus/test"

declare const container: HTMLElement

test("supports automatic disposal through the published declarations", () => {
  using animation = snow(container)

  animation.paused = true
})
