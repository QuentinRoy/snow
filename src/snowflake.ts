import type { SnowSettings } from "./snow"
import { randomNormal, toRadians } from "./math"

/** A flake keeps its appearance and velocity until it leaves the canvas. */
export default class SnowFlake {
  x = 0
  y = 0
  size: number
  color: string
  velocityX: number
  velocityY: number

  constructor(options: SnowSettings, speed?: number) {
    this.color = options.color
    this.size = Math.max(0, randomNormal(options.meanSize, options.sdSize))
    const flakeSpeed = Math.max(0, speed ?? randomNormal(options.meanSpeed, options.sdSpeed))
    const angle = randomNormal(toRadians(270 - options.meanAngle), toRadians(options.sdAngle))
    this.velocityX = Math.cos(angle) * flakeSpeed
    this.velocityY = -Math.sin(angle) * flakeSpeed
  }

  /** Move for an elapsed time in seconds; velocity is in CSS pixels per second. */
  tick(deltaTime: number): void {
    this.x += this.velocityX * deltaTime
    this.y += this.velocityY * deltaTime
  }

  /** Include partially visible circles until the whole flake has passed the edge. */
  isInRectangle(width: number, height: number): boolean {
    const radius = this.size / 2

    return (
      this.x >= -radius &&
      this.x <= width + radius &&
      this.y >= -radius &&
      this.y <= height + radius
    )
  }
}
