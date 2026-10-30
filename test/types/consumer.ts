import { snow } from "@quentinroy/snow"

declare const canvas: HTMLCanvasElement

using animation = snow(canvas)

animation.paused = true
