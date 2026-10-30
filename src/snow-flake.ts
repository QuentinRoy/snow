import type { SnowSettings } from "./snow"
import { randomNormal, toRadians } from "./math"

/** A circular snowflake with a position, appearance, and velocity. */
export class SnowFlake {
  x = 0
  y = 0
  size: number
  color: string
  velocityX: number
  velocityY: number

  constructor(options: SnowSettings, speed?: number) {
    this.color = options.flakeColor
    this.size = Math.max(0, randomNormal(options.flakeSize, options.flakeSizeDeviation))

    const nonNegativeSpeed = Math.max(
      0,
      speed ?? randomNormal(options.flakeSpeed, options.flakeSpeedDeviation),
    )

    const angle = randomNormal(
      toRadians(270 - options.flakeDirection),
      toRadians(options.flakeDirectionDeviation),
    )

    this.velocityX = Math.cos(angle) * nonNegativeSpeed
    this.velocityY = -Math.sin(angle) * nonNegativeSpeed
  }

  /** Advance the position by the given time in seconds. */
  tick(deltaTime: number): void {
    this.x += this.velocityX * deltaTime
    this.y += this.velocityY * deltaTime
  }

  /** Whether the flake's bounding box overlaps the rectangle starting at (0, 0). */
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
