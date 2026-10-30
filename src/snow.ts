import { createArrivals } from "./arrivals"
import { SnowFlake } from "./snow-flake"

/** How empty space gets filled. */
export type FillMode = "instant" | "none"

/** Controls and mutable settings for a snow animation. */
export interface SnowAnimation {
  /** Pause while keeping the current frame visible. */
  stop: () => void

  /** Continue from the paused positions. */
  resume: () => void

  /** Average flake diameter in CSS pixels. */
  flakeSize: number
  /** Standard deviation of flake diameters in CSS pixels. */
  flakeSizeDeviation: number
  /** Flake color as a CSS color string. */
  flakeColor: string
  /** Mean of the visible speed distribution in CSS pixels per second. */
  flakeSpeed: number
  /** Standard deviation of speeds in CSS pixels per second. */
  flakeSpeedDeviation: number
  /** Average number of snowflakes per 1,000 by 1,000 CSS-pixel area. */
  density: number
  /**
   * How to fill empty space at startup and in areas exposed by resizing.
   * "instant" fills it at once; "none" lets flakes drift in from the edges.
   */
  fillMode: FillMode
  /**
   * Average direction in degrees from vertically downward.
   * 90 is left, 180 is up, and -90 is right.
   */
  flakeDirection: number
  /** Standard deviation of directions in degrees. */
  flakeDirectionDeviation: number
  /** Show the frame rate. */
  showFps: boolean

  /**
   * Apply settings and layout changes, then redraw without advancing time.
   *
   * @remarks You don't usually need to call this method directly.
   */
  draw: () => void
}

/** Current appearance, motion, and density settings. */
export type SnowSettings = Omit<SnowAnimation, "draw" | "stop" | "resume">

/** Settings that override the defaults at startup. */
export type SnowOptions = Partial<SnowSettings>

/** Canvas dimensions in CSS pixels. */
export interface CanvasSize {
  width: number
  height: number
}

/** Resized canvas and the region shared with its previous size. */
interface ExposedArea extends CanvasSize {
  overlapWidth: number
  overlapHeight: number
}

const defaultOptions: SnowSettings = {
  flakeSize: 10,
  flakeSizeDeviation: 2,
  flakeSpeed: 150,
  flakeSpeedDeviation: 10,
  flakeDirection: 0,
  flakeDirectionDeviation: 5,
  flakeColor: "rgba(255,255,255,0.9)",
  density: 30,
  fillMode: "instant",
  showFps: false,
}

const numericSettingKeys = [
  "flakeSize",
  "flakeSizeDeviation",
  "flakeSpeed",
  "flakeSpeedDeviation",
  "flakeDirection",
  "flakeDirectionDeviation",
] as const

/**
 * Animate snow at a target visible density, with geometry measured in CSS pixels.
 *
 * @remarks
 * The `"instant"` fill mode seeds the canvas at startup and on growth. Later flakes enter through
 * the edges. Existing flakes keep their settings, so changes take effect as new
 * flakes arrive.
 */
export function snow(canvas: HTMLCanvasElement, options?: SnowOptions): SnowAnimation {
  const context = canvas.getContext("2d")

  if (context === null) {
    throw new Error(`Could not fetch canvas' context.`)
  }

  const snowFlakes: SnowFlake[] = []
  let animationFrameId: number | null = null
  let lastFrameTime = performance.now()
  let width = 0
  let height = 0
  const arrivals = createArrivals()

  // Reading the client size can force a layout, so only do it after a resize.
  let isSizeStale = true

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => {
          isSizeStale = true
        })

  resizeObserver?.observe(canvas)

  const frameDurations: number[] = []
  const maxFrameDurations = 50
  let nextFrameDurationIndex = 0

  /** Advance and render one animation frame. */
  const loop = (now: DOMHighResTimeStamp): void => {
    // The frame timestamp can precede the resume time; also avoid large jumps after a delayed frame.
    const deltaTime = Math.min(Math.max(0, (now - lastFrameTime) / 1000), 0.1)

    synchronize()
    advanceFlakes(deltaTime)

    lastFrameTime = now

    frameDurations[nextFrameDurationIndex] = deltaTime
    nextFrameDurationIndex = (nextFrameDurationIndex + 1) % maxFrameDurations

    render()
    animationFrameId = requestAnimationFrame(loop)
  }

  /** Move flakes, remove departures, and admit arrivals. */
  const advanceFlakes = (deltaTime: number): void => {
    // Compact in place to preserve drawing order without allocating another array.
    let survivingCount = 0

    for (const snowFlake of snowFlakes) {
      snowFlake.tick(deltaTime)

      if (snowFlake.isInRectangle(width, height)) {
        snowFlakes[survivingCount] = snowFlake
        survivingCount += 1
      }
    }

    snowFlakes.length = survivingCount
    arrivals.advance({
      deltaTime,
      settings: animation,
      bounds: { width, height },
      onArrival: ({ flake, age }) => {
        flake.tick(age)

        if (flake.isInRectangle(width, height)) {
          snowFlakes.push(flake)
        }
      },
    })
  }

  /** Populate newly exposed space with uniformly positioned flakes. */
  const fillExposedArea = (
    count: number,
    { width: nextWidth, height: nextHeight, overlapWidth, overlapHeight }: ExposedArea,
  ): void => {
    for (let i = 0; i < count; i += 1) {
      const snowFlake = new SnowFlake(animation)
      const radius = snowFlake.size / 2

      // Include partly visible circles to match the coverage of incoming flakes.
      if (overlapWidth === 0 || overlapHeight === 0) {
        snowFlake.x = Math.random() * (nextWidth + snowFlake.size) - radius
        snowFlake.y = Math.random() * (nextHeight + snowFlake.size) - radius
      } else {
        // Split the exposed region into nonoverlapping strips; weight by area for even coverage.
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

  /** Validate settings and apply resizing without advancing time. */
  const synchronize = (): void => {
    if (!Number.isFinite(animation.density) || animation.density < 0) {
      throw new RangeError("density must be a finite, nonnegative number")
    }

    for (const key of numericSettingKeys) {
      if (!Number.isFinite(animation[key])) {
        throw new RangeError(`${key} must be a finite number`)
      }
    }

    const nextWidth = isSizeStale ? canvas.clientWidth : width
    const nextHeight = isSizeStale ? canvas.clientHeight : height

    isSizeStale = resizeObserver === undefined

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

    // Preserve the shared region; only newly exposed space needs immediate filling.
    const exposedCount = animation.fillMode === "instant" ? count - overlapCount : 0
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

  /** Draw the current scene without advancing time. */
  const render = (): void => {
    context.save()
    // Keep positions and density in CSS pixels even when the canvas bitmap has more pixels.
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

      // Separate fills preserve overlap opacity and drawing order, including mixed colors.
      context.beginPath()
      context.arc(snowFlake.x, snowFlake.y, snowFlake.size / 2, 0, 2 * Math.PI)
      context.fill()
    }

    if (animation.showFps) {
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
    isSizeStale = true
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
      lastFrameTime = performance.now()
      animationFrameId = requestAnimationFrame(loop)
    }

    return animation
  }

  const animation: SnowAnimation = {
    ...defaultOptions,
    ...options,
    draw,
    stop,
    resume,
  }

  animation.draw()
  resume()

  return animation
}
