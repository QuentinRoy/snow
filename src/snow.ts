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
  /** Mean of the visible speed distribution in CSS pixels per second. */
  meanSpeed: number
  /** Standard deviation of speeds in CSS pixels per second. */
  sdSpeed: number
  /** Average number of snowflakes per 1,000 by 1,000 CSS-pixel area. */
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

interface ExposedArea extends CanvasSize {
  overlapWidth: number
  overlapHeight: number
}

const defaultOptions: SnowSettings = {
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

const numericSettingKeys = [
  "meanSize",
  "sdSize",
  "meanSpeed",
  "sdSpeed",
  "meanAngle",
  "sdAngle",
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
  let remainingArrivalIntensity: number | null = null

  // Keep recent frame durations for the FPS counter.
  const frameDurations: number[] = []
  const maxFrameDurations = 50
  let nextFrameDurationIndex = 0

  const loop = (): void => {
    const now = Date.now()
    const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.1)

    synchronize()
    advanceFlakes(deltaTime)

    lastFrameTime = now

    frameDurations[nextFrameDurationIndex] = deltaTime
    nextFrameDurationIndex = (nextFrameDurationIndex + 1) % maxFrameDurations

    render()
    animationFrameId = requestAnimationFrame(loop)
  }

  const advanceFlakes = (deltaTime: number): void => {
    let survivingCount = 0

    for (const snowFlake of snowFlakes) {
      snowFlake.tick(deltaTime)

      if (snowFlake.isInRectangle(width, height)) {
        snowFlakes[survivingCount] = snowFlake
        survivingCount += 1
      }
    }

    snowFlakes.length = survivingCount
    emitFlakes(deltaTime)
  }

  const emitFlakes = (deltaTime: number): void => {
    if (width === 0 || height === 0 || animation.density === 0 || deltaTime <= 0) {
      return
    }

    const proposal = speedProposal(animation)

    const rate =
      (animation.density / 1_000_000) *
      Math.hypot(width, height) *
      (proposal.normalWeight + proposal.tailWeight)

    if (!Number.isFinite(rate)) {
      throw new RangeError("Snowfall arrival rate must be finite")
    }

    if (rate === 0) {
      return
    }

    const bounds = { width, height }
    const crossingBound = Math.hypot(1 / width, 1 / height)
    let timeLeft = deltaTime
    let nextArrival = remainingArrivalIntensity ?? randomExponential()

    while (rate * timeLeft >= nextArrival) {
      timeLeft -= nextArrival / rate
      nextArrival = randomExponential()
      const speed = sampleArrivalSpeed(proposal)

      if (speed === undefined) {
        continue
      }

      const snowFlake = new SnowFlake(animation, speed)

      // Inverse residence time weights arrivals without favoring slow visible flakes.
      if (
        snowFlake.size > 0 &&
        Math.random() * speed * crossingBound < snowFlake.crossingRate(bounds)
      ) {
        snowFlake.enter(bounds)
        snowFlake.tick(timeLeft)

        if (snowFlake.isInRectangle(width, height)) {
          snowFlakes.push(snowFlake)
        }
      }
    }

    remainingArrivalIntensity = nextArrival - rate * timeLeft
  }

  const fillExposedArea = (
    count: number,
    { width: nextWidth, height: nextHeight, overlapWidth, overlapHeight }: ExposedArea,
  ): void => {
    for (let i = 0; i < count; i += 1) {
      const snowFlake = new SnowFlake(animation)
      const radius = snowFlake.size / 2

      if (overlapWidth === 0 || overlapHeight === 0) {
        snowFlake.x = Math.random() * (nextWidth + snowFlake.size) - radius
        snowFlake.y = Math.random() * (nextHeight + snowFlake.size) - radius
      } else {
        const rightArea = (nextWidth - overlapWidth) * (nextHeight + snowFlake.size)
        const bottomArea = (overlapWidth + snowFlake.size) * (nextHeight - overlapHeight)

        if (Math.random() * (rightArea + bottomArea) < rightArea) {
          snowFlake.x = overlapWidth + radius + Math.random() * (nextWidth - overlapWidth)
          snowFlake.y = Math.random() * (nextHeight + snowFlake.size) - radius
        } else {
          snowFlake.x = Math.random() * (overlapWidth + snowFlake.size) - radius
          snowFlake.y = overlapHeight + radius + Math.random() * (nextHeight - overlapHeight)
        }
      }

      snowFlakes.push(snowFlake)
    }
  }

  const synchronize = (): void => {
    if (!Number.isFinite(animation.density) || animation.density < 0) {
      throw new RangeError("density must be a finite, nonnegative number")
    }

    for (const key of numericSettingKeys) {
      if (!Number.isFinite(animation[key])) {
        throw new RangeError(`${key} must be a finite number`)
      }
    }

    const nextWidth = canvas.clientWidth
    const nextHeight = canvas.clientHeight

    const overlapWidth = Math.min(width, nextWidth)
    const overlapHeight = Math.min(height, nextHeight)
    const count = Math.round((animation.density * nextWidth * nextHeight) / 1_000_000)

    if (!Number.isSafeInteger(count)) {
      throw new RangeError("density produces too many snowflakes")
    }

    const overlapCount = Math.round((animation.density * overlapWidth * overlapHeight) / 1_000_000)

    if (nextWidth === width && nextHeight === height) {
      return
    }

    const exposedCount = animation.autoFill ? count - overlapCount : 0
    let survivingCount = 0

    for (const snowFlake of snowFlakes) {
      if (nextWidth > 0 && nextHeight > 0 && snowFlake.isInRectangle(overlapWidth, overlapHeight)) {
        snowFlakes[survivingCount] = snowFlake
        survivingCount += 1
      }
    }

    snowFlakes.length = survivingCount

    fillExposedArea(exposedCount, {
      width: nextWidth,
      height: nextHeight,
      overlapWidth,
      overlapHeight,
    })

    width = nextWidth
    height = nextHeight
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

    let currentColor: string | undefined

    for (const snowFlake of snowFlakes) {
      if (snowFlake.size <= 0) {
        continue
      }

      if (currentColor !== snowFlake.color) {
        context.fillStyle = snowFlake.color
        currentColor = snowFlake.color
      }

      context.beginPath()
      context.arc(snowFlake.x, snowFlake.y, snowFlake.size / 2, 0, 2 * Math.PI)
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

  crossingRate({ width, height }: CanvasSize): number {
    return (
      Math.abs(this.velocityX) / (width + this.size) +
      Math.abs(this.velocityY) / (height + this.size)
    )
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
  }

  tick(deltaTime: number): void {
    this.x += this.velocityX * deltaTime
    this.y += this.velocityY * deltaTime
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

interface SpeedProposal {
  mean: number
  deviation: number
  normalWeight: number
  tailWeight: number
}

// The speed-weighted normal is bounded by a normal plus a shifted Rayleigh tail.
// A negative mean uses an unshifted tail with exponential thinning instead.
const speedProposal = ({ meanSpeed, sdSpeed }: SnowSettings): SpeedProposal => {
  const deviation = Math.abs(sdSpeed)
  const negativeMean = deviation === 0 ? 0 : Math.min(0, meanSpeed) / deviation

  return {
    mean: meanSpeed,
    deviation,
    normalWeight: Math.max(0, meanSpeed),
    tailWeight: (deviation / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * negativeMean ** 2),
  }
}

const sampleArrivalSpeed = ({
  mean,
  deviation,
  normalWeight,
  tailWeight,
}: SpeedProposal): number | undefined => {
  // This normal/Rayleigh envelope weights speeds exactly, without a cutoff or resampling loop.
  if (Math.random() * (normalWeight + tailWeight) < normalWeight) {
    const speed = randomNormal(mean, deviation)

    if (speed > 0 && (speed >= normalWeight || Math.random() * normalWeight < speed)) {
      return speed
    }

    return undefined
  }

  const speed = normalWeight + deviation * Math.sqrt(2 * randomExponential())

  if (mean < 0 && Math.random() >= Math.exp((mean / deviation) * (speed / deviation))) {
    return undefined
  }

  return Number.isFinite(speed) && speed > 0 ? speed : undefined
}

const randomExponential = (): number => {
  let probability = 0

  while (probability === 0) {
    probability = Math.random()
  }

  return -Math.log(probability)
}

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
