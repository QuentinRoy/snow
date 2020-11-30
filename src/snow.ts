interface SnowOptions {
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
}

export default class Snow implements SnowOptions {
  /** {@inheritdoc SnowOptions.meanSize} */
  public meanSize = 10
  /** {@inheritdoc SnowOptions.sdSize} */
  public sdSize = 2
  /** {@inheritdoc SnowOptions.meanSpeed} */
  public meanSpeed = 150
  /** {@inheritdoc SnowOptions.sdSpeed} */
  public sdSpeed = 10
  /** {@inheritdoc SnowOptions.meanAngle} */
  public meanAngle = 0
  /** {@inheritdoc SnowOptions.sdAngle} */
  public sdAngle = 5
  /** {@inheritdoc SnowOptions.color} */
  public color = "rgba(255,255,255,0.9)"
  /** {@inheritdoc SnowOptions.flow} */
  public flow = 0.01
  /** {@inheritdoc SnowOptions.isFpsShown} */
  public isFpsShown = false

  /** The canvas used to draw. */
  public readonly canvas: HTMLCanvasElement

  /**
   * Creates a Snow instance and immediately start the animation.
   *
   * @param canvas - The canvas to draw in.
   * @param opts - Optional arguments. Each property will be directly mapped to
   * the Snow property of the same name.
   */
  constructor(canvas: HTMLCanvasElement, opts?: Partial<SnowOptions>) {
    this.canvas = canvas
    Object.assign(this, opts)
    this.resume()
  }

  // Used by the loop.
  #snowFlakes: SnowFlake[] = []
  #animationFrameRequest?: number | null = null
  #lastTime = Date.now()
  // Remember the decimal part of the number of snow flakes to
  // create each tick, so it can be added it back on the next tick.
  #remainerNSnowFlakes = 0

  // This is used for dps measurements.
  #drawDeltas: number[] = []
  #maxDrawDeltas = 50
  #nextDrawDeltaIdx = 0

  #loop = (): void => {
    let now = Date.now()
    let deltaTime = (now - this.#lastTime) / 1000

    this.#tick(deltaTime)

    this.#lastTime = now

    // Register FPS information.
    this.#drawDeltas[this.#nextDrawDeltaIdx] = deltaTime
    this.#nextDrawDeltaIdx = (this.#nextDrawDeltaIdx + 1) % this.#maxDrawDeltas

    this.draw()
    this.#animationFrameRequest = requestAnimationFrame(this.#loop)
  }

  #tick = (deltaTime: number): void => {
    // Update each snow flake.
    this.#snowFlakes.forEach((snowFlake) => {
      snowFlake.tick(deltaTime)
    })

    // Remove snow flakes that got out.
    this.#snowFlakes = this.#snowFlakes.filter((snowFlake) =>
      snowFlake.isInRect(0, 0, this.canvas.width, this.canvas.height)
    )

    // Create the new snow flakes.
    let nNewSnowFlakes =
      Math.random() * this.flow * deltaTime * this.canvas.width +
      this.#remainerNSnowFlakes
    this.#remainerNSnowFlakes = nNewSnowFlakes - Math.floor(nNewSnowFlakes)
    nNewSnowFlakes = Math.floor(nNewSnowFlakes)

    for (let i = 0; i < nNewSnowFlakes; i += 1) {
      let snowFlake = SnowFlake.newRandom(
        this.meanSize,
        this.sdSize,
        this.meanSpeed,
        this.sdSpeed,
        this.meanAngle,
        this.sdAngle,
        this.color,
        this.canvas.width,
        this.canvas.height
      )
      // Spread out the snow flakes in the elapsed window of time.
      snowFlake.tick(Math.random() * deltaTime)
      if (
        snowFlake.size > 0 &&
        snowFlake.speed > 0 &&
        snowFlake.isInRect(0, 0, this.canvas.width, this.canvas.height)
      ) {
        this.#snowFlakes.push(snowFlake)
      }
    }
  }

  /**
   * Redraw the snow flakes (but don't update their position).
   *
   * @remarks You don't usually need to call this method directly.
   */
  draw(): void {
    let { width, height } = this.canvas
    let context = this.canvas.getContext("2d")

    if (context == null) throw new Error(`Could not fetch canvas' context.`)

    context.save()

    // Draw the snow flakes.
    context.clearRect(0, 0, width, height)
    for (let i = 0; i < this.#snowFlakes.length; i++) {
      let snowFlake = this.#snowFlakes[i]
      context.fillStyle = snowFlake.color
      context.beginPath()
      context.moveTo(snowFlake.x, snowFlake.y)
      context.arc(snowFlake.x, snowFlake.y, snowFlake.size / 2, 0, 2 * Math.PI)
      context.fill()
    }

    // Show the FPS counter.
    if (this.isFpsShown) {
      let avgDrawDelta =
        this.#drawDeltas.length > 0
          ? this.#drawDeltas.reduce((a, b) => a + b, 0) /
            this.#drawDeltas.length
          : 0
      context.font = "20px sans-serif"
      context.fillStyle = "red"
      context.fillText(`${Math.round(1 / avgDrawDelta)} FPS`, 10, 30)
    }

    context.restore()
  }

  /**
   * Stop the animation.
   */
  public stop(): Snow {
    if (this.#animationFrameRequest != null) {
      cancelAnimationFrame(this.#animationFrameRequest)
      this.#animationFrameRequest = null
    }
    return this
  }

  /**
   * Resume the animation if it was stopped.
   */
  public resume(): Snow {
    if (this.#animationFrameRequest == null) {
      this.#animationFrameRequest = requestAnimationFrame(this.#loop)
    }
    return this
  }
}

class SnowFlake {
  constructor(
    public x: number,
    public y: number,
    public color: string,
    public speed: number,
    public angle: number,
    public size: number
  ) {}

  tick(this: SnowFlake, deltaTime: number) {
    this.x += Math.cos(this.angle) * this.speed * deltaTime
    this.y -= Math.sin(this.angle) * this.speed * deltaTime
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
    canvasHeight: number
  ): SnowFlake {
    // We compute the size first because the initial y value depends on it.
    let size = randomNormal(meanSize, sdSize)
    let projectedPos = Math.random() * canvasWidth
    let x, y
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
        toRad(sdAngle)
      ),
      size
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

function randomNormal(mean = 0, sd = 1) {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random() // Convert [0,1) to (0,1).
  while (v === 0) v = Math.random()
  return (
    Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * Math.abs(sd) +
    mean
  )
}

function toRad(alpha: number) {
  return (alpha / 180) * Math.PI
}
