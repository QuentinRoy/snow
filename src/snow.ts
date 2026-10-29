interface SnowAnimation {
  /**
   * Stop the animation.
   */
  stop: () => void

  /**
   * Resume the animation if it was stopped.
   */
  resume: () => void

  /** Defines the average size of the snow flakes. */
  meanSize: number
  /** Defines the standard deviation from the mean of snow flakes' size. */
  sdSize: number
  /** Defines the color of the snow flakes. */
  color: string
  /** Defines the average speed of the snow flakes. */
  meanSpeed: number
  /** Defines the standard deviation from the mean of snow flakes' speed. */
  sdSpeed: number
  /** Defines the number of snow flakes to create per second and per pixels. */
  flow: number
  /**
   * Indicates the average direction in degrees of the snowflake.
   * meanAngle = 0 that the snow flakes fall vertically.
   *
   * @remarks Currently, meanAngle != 0 creates a zone in the viewport with
   * less snow flakes, and meanAngle &gt;= 90 is not supported.
   *
   * @experimental
   */
  meanAngle: number
  /** Defines the standard deviation from the mean of snow flakes' angle. */
  sdAngle: number
  /** Display the number of frames per seconds. */
  isFpsShown: boolean

  /**
   * Redraw the snow flakes (but don't update their position).
   *
   * @remarks You don't usually need to call this method directly.
   */
  draw: () => void
}

type SnowOptions = Partial<Omit<SnowAnimation, "draw" | "stop" | "resume">>

const defaultsProps: Required<SnowOptions> = {
  meanSize: 10,
  sdSize: 2,
  meanSpeed: 150,
  sdSpeed: 10,
  meanAngle: 0,
  sdAngle: 5,
  color: "rgba(255,255,255,0.9)",
  flow: 0.01,
  isFpsShown: false,
}

export default function Snow(canvas: HTMLCanvasElement, opts?: SnowOptions): SnowAnimation {
  // Used by the loop.
  const snowFlakes: SnowFlake[] = []
  let animationFrameRequest: number | null = null
  let lastTime = Date.now()
  // Remember the decimal part of the number of snow flakes to
  // create each tick, so it can be added it back on the next tick.
  let remainerNSnowFlakes = 0

  // snow is used for dps measurements.
  const drawDeltas: number[] = []
  const maxDrawDeltas = 50
  let nextDrawDeltaIdx = 0

  const loop = (): void => {
    const now = Date.now()
    const deltaTime = Math.min((now - lastTime) / 1000, 0.1)

    tick(deltaTime)

    lastTime = now

    // Register FPS information.
    drawDeltas[nextDrawDeltaIdx] = deltaTime
    nextDrawDeltaIdx = (nextDrawDeltaIdx + 1) % maxDrawDeltas

    snow.draw()
    animationFrameRequest = requestAnimationFrame(loop)
  }

  const tick = (deltaTime: number): void => {
    let nSurvivingSnowFlakes = 0

    for (const snowFlake of snowFlakes) {
      snowFlake.tick(deltaTime)

      if (snowFlake.isInRect(0, 0, canvas.width, canvas.height)) {
        snowFlakes[nSurvivingSnowFlakes] = snowFlake
        nSurvivingSnowFlakes += 1
      }
    }

    snowFlakes.length = nSurvivingSnowFlakes

    // Create the new snow flakes.
    let nNewSnowFlakes = Math.random() * snow.flow * deltaTime * canvas.width + remainerNSnowFlakes

    remainerNSnowFlakes = nNewSnowFlakes - Math.floor(nNewSnowFlakes)
    nNewSnowFlakes = Math.floor(nNewSnowFlakes)

    for (let i = 0; i < nNewSnowFlakes; i += 1) {
      const snowFlake = SnowFlake.newRandom(
        snow.meanSize,
        snow.sdSize,
        snow.meanSpeed,
        snow.sdSpeed,
        snow.meanAngle,
        snow.sdAngle,
        snow.color,
        canvas.width,
        canvas.height,
      )

      // Spread out the snow flakes in the elapsed window of time.
      snowFlake.tick(Math.random() * deltaTime)

      if (
        snowFlake.size > 0 &&
        snowFlake.speed > 0 &&
        snowFlake.isInRect(0, 0, canvas.width, canvas.height)
      ) {
        snowFlakes.push(snowFlake)
      }
    }
  }

  const draw = (): void => {
    const { width, height } = canvas
    const context = canvas.getContext("2d")

    if (context === null) {
      throw new Error(`Could not fetch canvas' context.`)
    }

    context.save()

    // Draw the snow flakes.
    context.clearRect(0, 0, width, height)

    const n = snowFlakes.length

    if (n > 0) {
      // A single fill colors the whole path, so keep the last flake's color.
      context.fillStyle = snowFlakes[n - 1].color
    }

    context.beginPath()

    for (let i = 0; i < n; i += 1) {
      const snowFlake = snowFlakes[i]
      const { x, y } = snowFlake
      context.moveTo(x, y)
      context.arc(x, y, snowFlake.size / 2, 0, 2 * Math.PI)
    }

    context.fill()

    // Show the FPS counter.
    if (snow.isFpsShown) {
      const avgDrawDelta =
        drawDeltas.length > 0 ? drawDeltas.reduce((a, b) => a + b, 0) / drawDeltas.length : 0

      context.font = "20px sans-serif"
      context.fillStyle = "red"
      context.fillText(`${Math.round(1 / avgDrawDelta)} FPS`, 10, 30)
    }

    context.restore()
  }

  const stop = (): SnowAnimation => {
    if (animationFrameRequest !== null) {
      cancelAnimationFrame(animationFrameRequest)
      animationFrameRequest = null
    }

    return snow
  }

  const resume = (): SnowAnimation => {
    if (animationFrameRequest === null) {
      lastTime = Date.now()
      animationFrameRequest = requestAnimationFrame(loop)
    }

    return snow
  }

  const snow: SnowAnimation = { ...opts, ...defaultsProps, draw, stop, resume }

  resume()

  return snow
}

class SnowFlake {
  x: number
  y: number
  color: string
  speed: number
  velocityX: number
  velocityY: number
  size: number

  constructor(x: number, y: number, color: string, speed: number, angle: number, size: number) {
    this.x = x
    this.y = y
    this.color = color
    this.speed = speed
    this.velocityX = Math.cos(angle) * speed
    this.velocityY = -Math.sin(angle) * speed
    this.size = size
  }

  tick(this: SnowFlake, deltaTime: number) {
    this.x += this.velocityX * deltaTime
    this.y += this.velocityY * deltaTime

    return this
  }

  static newRandom(
    meanSize: number,
    sdSize: number,
    meanSpeed: number,
    sdSpeed: number,
    meanAngle: number,
    sdAngle: number,
    color: string,
    canvasWidth: number,
    canvasHeight: number,
  ): SnowFlake {
    // We compute the size first because the initial y value depends on it.
    const size = randomNormal(meanSize, sdSize)
    const projectedPos = Math.random() * canvasWidth
    let x
    let y

    if (projectedPos < canvasWidth) {
      // Case the snow flake should be created at the top
      x = Math.random() * canvasWidth
      y = -size / 2
    } else if (projectedPos < canvasWidth + canvasHeight) {
      // Case the snow flake should be created at the right
      x = size / 2 + canvasWidth
      y = Math.random() * canvasHeight
    } else if (projectedPos < 2 * canvasWidth + canvasHeight) {
      // Case the snow flake should be created at the bottom
      x = Math.random() * canvasWidth
      y = canvasHeight + size / 2
    } else {
      // Case the snow flake should be created at the left
      x = -size / 2
      y = Math.random() * canvasHeight
    }

    return new SnowFlake(
      x,
      y,
      color,
      randomNormal(meanSpeed, sdSpeed),
      randomNormal(
        // Convert the API angle to trigonometric angle.
        toRad(270 - meanAngle),
        toRad(sdAngle),
      ),
      size,
    )
  }

  isInRect(x: number, y: number, width: number, height: number) {
    return (
      this.y <= y + height + this.size / 2 &&
      this.y >= y - this.size / 2 &&
      this.x <= x + width + this.size / 2 &&
      this.x >= x - this.size / 2
    )
  }
}

const randomNormal = (mean = 0, sd = 1) => {
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

const toRad = (alpha: number) => (alpha / 180) * Math.PI
