import { snow } from "@quentinroy/snow"
import { test } from "vite-plus/test"

declare const canvas: HTMLCanvasElement

test("supports automatic disposal through the published declarations", () => {
  using animation = snow(canvas)

  animation.paused = true
})
