interface SnowAnimation {
  /** Pause while keeping the current frame visible. */
  stop: () => void

  /** Continue from the paused positions. */
  resume: () => void

  /** Average flake diameter in CSS pixels. */
  meanSize: number
  /** Standard deviation of flake diameters in CSS pixels. */
  sdSize: number
  /** Flake color as a CSS color string. */
  color: string
  /** Average speed in CSS pixels per second. */
  meanSpeed: number
  /** Standard deviation of speeds in CSS pixels per second. */
  sdSpeed: number
  /** Target number of snowflakes per 1,000 by 1,000 CSS-pixel area. */
  density: number
  /** Fill the canvas at startup and newly exposed areas after resizing. */
  autoFill: boolean
  /**
   * Average direction in degrees from vertically downward.
   * 90 is left, 180 is up, and -90 is right.
   */
  meanAngle: number
  /** Standard deviation of directions in degrees. */
  sdAngle: number
  /** Show the frame rate. */
  isFpsShown: boolean

  /**
   * Apply settings and layout changes, then redraw without advancing time.
   *
   * @remarks You don't usually need to call this method directly.
   */
  draw: () => void
}

type SnowSettings = Omit<SnowAnimation, "draw" | "stop" | "resume">

type SnowOptions = Partial<SnowSettings>

interface CanvasSize {
  width: number
  height: number
}

type FlakeArea = CanvasSize & { x?: number; y?: number; isVisible?: boolean }

const defaultOptions: Required<SnowOptions> = {
  meanSize: 10,
  sdSize: 2,
  meanSpeed: 150,
  sdSpeed: 10,
  meanAngle: 0,
  sdAngle: 5,
  color: "rgba(255,255,255,0.9)",
  density: 30,
  autoFill: true,
  isFpsShown: false,
}

const flakeSettingKeys = [
  "meanSize",
  "sdSize",
  "meanSpeed",
  "sdSpeed",
  "meanAngle",
  "sdAngle",
  "color",
] as const

export default function snow(canvas: HTMLCanvasElement, options?: SnowOptions): SnowAnimation {
  const context = canvas.getContext("2d")

  if (context === null) {
    throw new Error(`Could not fetch canvas' context.`)
  }

  const snowFlakes: SnowFlake[] = []
  let animationFrameId: number | null = null
  let lastFrameTime = Date.now()
  let width = 0
  let height = 0
  let previousDensity = -1
  let targetFlakeCount = 0
  let flakeSettings: SnowSettings = { ...defaultOptions, ...options }

  // Keep recent frame durations for the FPS counter.
  const frameDurations: number[] = []
  const maxFrameDurations = 50
  let nextFrameDurationIndex = 0

  const loop = (): void => {
    const now = Date.now()
    const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.1)

    synchronize()

    let flakesToRetire = Math.max(0, snowFlakes.length - targetFlakeCount)
    let survivingCount = 0
    const bounds = { width, height }

    for (const snowFlake of snowFlakes) {
      const hasExited = snowFlake.tick(deltaTime, bounds)

      // Retire excess at the edge so resize and density changes preserve visible flakes.
      if (hasExited && flakesToRetire > 0) {
        flakesToRetire -= 1
        continue
      }

      if (hasExited && snowFlake.settings !== flakeSettings) {
        snowFlake.update(flakeSettings)
        snowFlake.enter(bounds)
        snowFlake.tick(Math.random() * deltaTime, bounds)
      }

      snowFlakes[survivingCount] = snowFlake
      survivingCount += 1
    }

    snowFlakes.length = survivingCount
    lastFrameTime = now

    frameDurations[nextFrameDurationIndex] = deltaTime
    nextFrameDurationIndex = (nextFrameDurationIndex + 1) % maxFrameDurations

    render()
    animationFrameId = requestAnimationFrame(loop)
  }

  const addFlakes = (
    count: number,
    { x = 0, y = 0, width: areaWidth, height: areaHeight, isVisible = false }: FlakeArea,
  ): void => {
    for (let i = 0; i < count; i += 1) {
      const snowFlake = new SnowFlake(flakeSettings)
      snowFlake.isVisible = isVisible
      snowFlake.x = x + Math.random() * areaWidth
      snowFlake.y = y + Math.random() * areaHeight
      snowFlakes.push(snowFlake)
    }
  }

  const synchronize = (): void => {
    if (!Number.isFinite(animation.density) || animation.density < 0) {
      throw new RangeError("density must be a finite, nonnegative number")
    }

    if (flakeSettingKeys.some((key) => animation[key] !== flakeSettings[key])) {
      flakeSettings = { ...animation }

      for (const snowFlake of snowFlakes) {
        if (!snowFlake.isVisible) {
          snowFlake.update(flakeSettings)
          snowFlake.x = Math.random() * width
          snowFlake.y = Math.random() * height
        }
      }
    }

    const nextWidth = canvas.clientWidth
    const nextHeight = canvas.clientHeight

    if (nextWidth === width && nextHeight === height && previousDensity === animation.density) {
      return
    }

    const overlapWidth = Math.min(width, nextWidth)
    const overlapHeight = Math.min(height, nextHeight)
    const exposedArea = nextWidth * nextHeight - overlapWidth * overlapHeight
    const count = Math.round((animation.density * nextWidth * nextHeight) / 1_000_000)

    if (!Number.isSafeInteger(count)) {
      throw new RangeError("density produces too many snowflakes")
    }

    const overlapCount = Math.round((animation.density * overlapWidth * overlapHeight) / 1_000_000)
    const exposedCount = count - overlapCount
    let survivingCount = 0

    for (const snowFlake of snowFlakes) {
      if (nextWidth > 0 && nextHeight > 0 && snowFlake.isInRectangle(overlapWidth, overlapHeight)) {
        snowFlakes[survivingCount] = snowFlake
        survivingCount += 1
      }
    }

    snowFlakes.length = survivingCount

    addFlakes(overlapCount - snowFlakes.length, { width: overlapWidth, height: overlapHeight })

    const rightArea = (nextWidth - overlapWidth) * nextHeight

    for (let i = 0; i < exposedCount; i += 1) {
      if (Math.random() * exposedArea < rightArea) {
        addFlakes(1, {
          x: overlapWidth,
          width: nextWidth - overlapWidth,
          height: nextHeight,
          isVisible: animation.autoFill,
        })
      } else {
        addFlakes(1, {
          y: overlapHeight,
          width: overlapWidth,
          height: nextHeight - overlapHeight,
          isVisible: animation.autoFill,
        })
      }
    }

    width = nextWidth
    height = nextHeight
    previousDensity = animation.density
    targetFlakeCount = count
  }

  const render = (): void => {
    context.save()
    context.setTransform(
      width > 0 ? canvas.width / width : 1,
      0,
      0,
      height > 0 ? canvas.height / height : 1,
      0,
      0,
    )

    context.clearRect(0, 0, width, height)

    const colorBatches = new Map<string, SnowFlake[]>()

    for (const snowFlake of snowFlakes) {
      if (!snowFlake.isVisible || snowFlake.size <= 0) {
        continue
      }

      const batch = colorBatches.get(snowFlake.color)

      if (batch) {
        batch.push(snowFlake)
      } else {
        colorBatches.set(snowFlake.color, [snowFlake])
      }
    }

    // Stable color groups keep overlap opacity unchanged as flakes enter and leave.
    // oxlint-disable-next-line unicorn/no-array-sort -- Sort a fresh array to support ES2020 browsers.
    const batches = [...colorBatches].sort(([left], [right]) => left.localeCompare(right))

    for (const [color, flakes] of batches) {
      context.fillStyle = color
      context.beginPath()

      for (const { x, y, size } of flakes) {
        context.moveTo(x, y)
        context.arc(x, y, size / 2, 0, 2 * Math.PI)
      }

      context.fill()
    }

    if (animation.isFpsShown) {
      const averageFrameDuration =
        frameDurations.length > 0
          ? frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length
          : 0

      context.font = "20px sans-serif"
      context.fillStyle = "red"
      const fps = averageFrameDuration > 0 ? Math.round(1 / averageFrameDuration) : 0
      context.fillText(`${fps} FPS`, 10, 30)
    }

    context.restore()
  }

  const draw = (): void => {
    synchronize()
    render()
  }

  const stop = (): SnowAnimation => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    return animation
  }

  const resume = (): SnowAnimation => {
    if (animationFrameId === null) {
      lastFrameTime = Date.now()
      animationFrameId = requestAnimationFrame(loop)
    }

    return animation
  }

  const animation: SnowAnimation = { ...defaultOptions, ...options, draw, stop, resume }

  animation.draw()
  resume()

  return animation
}

class SnowFlake {
  x = 0
  y = 0
  size = 0
  speed = 0
  angle = 0
  velocityX = 0
  velocityY = 0
  isVisible: boolean
  color = ""
  settings: SnowSettings

  constructor(options: SnowSettings) {
    this.isVisible = options.autoFill
    this.settings = options
    this.update(options)
  }

  update(options: SnowSettings): void {
    this.settings = options
    this.color = options.color
    this.size = Math.max(0, randomNormal(options.meanSize, options.sdSize))
    this.speed = Math.max(0, randomNormal(options.meanSpeed, options.sdSpeed))
    this.angle = randomNormal(toRadians(270 - options.meanAngle), toRadians(options.sdAngle))
    this.velocityX = Math.cos(this.angle) * this.speed
    this.velocityY = -Math.sin(this.angle) * this.speed
  }

  enter({ width, height }: CanvasSize): void {
    const radius = this.size / 2
    const horizontalEdgeWeight = (width + this.size) * Math.abs(this.velocityY)
    const verticalEdgeWeight = (height + this.size) * Math.abs(this.velocityX)

    if (Math.random() * (horizontalEdgeWeight + verticalEdgeWeight) < horizontalEdgeWeight) {
      this.x = Math.random() * (width + this.size) - radius
      this.y = this.velocityY > 0 ? -radius : height + radius
    } else {
      this.x = this.velocityX > 0 ? -radius : width + radius
      this.y = Math.random() * (height + this.size) - radius
    }

    this.isVisible = this.speed > 0
  }

  tick(deltaTime: number, { width, height }: CanvasSize): boolean {
    this.x += this.velocityX * deltaTime
    this.y += this.velocityY * deltaTime
    const radius = this.size / 2
    const hasExited = !this.isInRectangle(width, height)

    // Hidden flakes enter on their first wrap, without a separate creation rate.
    if (this.x < -radius || this.x > width + radius) {
      this.isVisible = true
      this.x = wrap(this.x + radius, width + this.size) - radius
    }

    if (this.y < -radius || this.y > height + radius) {
      this.isVisible = true
      this.y = wrap(this.y + radius, height + this.size) - radius
    }

    return hasExited
  }

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

const wrap = (position: number, length: number): number => ((position % length) + length) % length

const randomNormal = (mean = 0, sd = 1) => {
  if (sd === 0) {
    return mean
  }

  let u = 0
  let v = 0

  // Avoid zero because its logarithm is undefined.
  while (u === 0) {
    u = Math.random()
  }

  while (v === 0) {
    v = Math.random()
  }

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * Math.abs(sd) + mean
}

const toRadians = (degrees: number) => (degrees / 180) * Math.PI
