import { afterEach, expect, test, vi } from "vite-plus/test"
import * as snowModule from "./snow"
import { snow as createSnow } from "./snow"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Create a fake canvas and a manually advanced animation.
 * @param {Parameters<typeof createSnow>[1]} [options] Initial settings.
 * @param {() => number} [random] Random source.
 */
function setupAnimation(options, random) {
  /** @type {FrameRequestCallback | undefined} */
  let nextFrame

  /** @param {FrameRequestCallback} onFrame Scheduled frame. */
  const scheduleFrame = (onFrame) => {
    nextFrame = onFrame

    return 1
  }

  const requestFrame = vi.fn(scheduleFrame)
  const cancelFrame = vi.fn()
  vi.stubGlobal("requestAnimationFrame", requestFrame)
  vi.stubGlobal("cancelAnimationFrame", cancelFrame)
  const now = vi.spyOn(performance, "now").mockReturnValue(0)
  const randomMock = vi.spyOn(Math, "random").mockReturnValue(0.5)

  if (random) {
    randomMock.mockImplementation(random)
  }

  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    fillText: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
  }

  const canvas = {
    clientHeight: 100,
    clientWidth: 100,
    getContext: vi.fn().mockReturnValue(context),
    height: 100,
    width: 100,
  }

  const snow = createSnow(canvas, {
    density: 100,
    flakeDirectionDeviation: 0,
    flakeSize: 10,
    flakeSizeDeviation: 0,
    flakeSpeed: 100,
    flakeSpeedDeviation: 0,
    ...options,
  })

  /** @param {number} time Frame time in milliseconds. */
  const frame = (time) => {
    context.arc.mockClear()
    nextFrame?.(time)
  }

  /** @param {number} width Displayed width. @param {number} height Displayed height. */
  const resize = (width, height) => {
    canvas.clientWidth = width
    canvas.clientHeight = height
    canvas.width = width
    canvas.height = height
    context.arc.mockClear()
    snow.draw()
  }

  return { cancelFrame, canvas, context, frame, now, requestFrame, resize, snow }
}

test("fills immediately at the configured density and scales with area", () => {
  const { context, resize } = setupAnimation()
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([50, 50, 5])

  resize(200, 200)
  expect(context.arc).toHaveBeenCalledTimes(4)
})

test.each([
  { count: 8, height: 100, newX: 155, newY: 50, width: 200 },
  { count: 8, height: 200, newX: 50, newY: 155, width: 100 },
  { count: 6, height: 50, newX: 155, newY: 25, width: 200 },
])(
  "preserves overlap and fills exposed space at $width by $height",
  ({ count, height, newX, newY, width }) => {
    const { context, resize } = setupAnimation({ density: 400 })
    resize(width, height)
    expect(context.arc).toHaveBeenCalledTimes(count)
    expect(context.arc.mock.calls.filter(([x, y]) => x === 50 && y === 50)).toHaveLength(4)
    expect(context.arc.mock.calls).toContainEqual([newX, newY, 5, 0, 2 * Math.PI])
  },
)

test("uses CSS pixels for density, size, and speed on high-resolution canvases", () => {
  const { canvas, context, frame } = setupAnimation()
  canvas.width = 200
  canvas.height = 200
  frame(20)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([50, 52, 5])
  expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0)

  canvas.clientWidth = 200
  frame(40)
  expect(context.arc).toHaveBeenCalledTimes(2)
  expect(context.setTransform).toHaveBeenLastCalledWith(1, 0, 0, 2, 0, 0)
})

test.each([
  { angle: 0, axis: 1, boundary: -5, sign: 1 },
  { angle: 90, axis: 0, boundary: 105, sign: -1 },
  { angle: -90, axis: 0, boundary: -5, sign: 1 },
  { angle: 180, axis: 1, boundary: 105, sign: -1 },
  { angle: 60, axis: 0, boundary: 105, sign: -1 },
  { angle: -60, axis: 0, boundary: -5, sign: 1 },
  { angle: 120, axis: 0, boundary: 105, sign: -1 },
  { angle: -120, axis: 0, boundary: -5, sign: 1 },
])("arrives from an incoming edge at $angle degrees", ({ angle, axis, boundary, sign }) => {
  const { context, frame } = setupAnimation({
    density: 10_000,
    fillMode: "none",
    flakeDirection: angle,
  })

  frame(20)
  expect(context.arc.mock.calls.length).toBeGreaterThan(0)

  for (const call of context.arc.mock.calls) {
    const distance = (Number(call[axis]) - boundary) * sign
    expect(distance).toBeGreaterThanOrEqual(0)
    expect(distance).toBeLessThan(2)
  }
})

test("starts empty and admits flakes without waiting for a departure", () => {
  const { context, frame } = setupAnimation({ fillMode: "none" })
  expect(context.arc).not.toHaveBeenCalled()

  for (let time = 100; time <= 400; time += 100) {
    frame(time)
    expect(context.arc).not.toHaveBeenCalled()
  }

  frame(500)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0][1]).toBeGreaterThan(-5)
  expect(context.arc.mock.calls[0][1]).toBeLessThan(5)
})

test("lets arrivals cover new space after resizing when fillMode is none", () => {
  const { context, frame, resize, snow } = setupAnimation()
  snow.fillMode = "none"
  resize(200, 100)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])

  for (let time = 100; time <= 400; time += 100) {
    frame(time)
  }

  expect(context.arc).toHaveBeenCalledTimes(2)
  expect(context.arc.mock.calls.some(([x]) => x >= 100)).toBe(true)
})

test("keeps visible attributes and uses new settings for independent arrivals", () => {
  const { context, frame, snow } = setupAnimation()
  snow.flakeSize = 20
  snow.flakeSpeed = 200
  snow.flakeDirection = -90
  snow.flakeColor = "blue"
  context.arc.mockClear()
  snow.draw()
  expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([50, 50, 5])
  expect(context.fillStyle).toBe("rgba(255,255,255,0.9)")
  frame(100)
  expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([50, 60, 5])

  for (let time = 200; time <= 600; time += 100) {
    frame(time)
  }

  expect(context.arc.mock.calls.length).toBeGreaterThan(0)

  for (const [x, y, radius] of context.arc.mock.calls) {
    expect(x).toBeGreaterThanOrEqual(-10)
    expect(x).toBeLessThanOrEqual(110)
    expect(y).toBeCloseTo(50)
    expect(radius).toBe(10)
  }

  expect(context.fillStyle).toBe("blue")
})

test("switching fillMode to instant only fills newly exposed space", () => {
  const { context, resize, snow } = setupAnimation({ fillMode: "none", flakeSpeed: 0 })
  snow.fillMode = "instant"
  snow.draw()
  expect(context.arc).not.toHaveBeenCalled()
  resize(200, 100)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([155, 50])
})

test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
  "rejects invalid density %s with a clear error",
  (density) => {
    expect(() => setupAnimation({ density })).toThrow(
      "density must be a finite, nonnegative number",
    )
  },
)

test("keeps negative sampled speeds stationary", () => {
  const { context, frame } = setupAnimation({ flakeSpeed: -100 })
  frame(100)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
})

test("skips nonpositive sampled sizes", () => {
  const { context, frame } = setupAnimation({ flakeSize: -10 })
  frame(100)
  expect(context.arc).not.toHaveBeenCalled()
})

test("shows a finite frame rate before the first animation frame", () => {
  const { context, frame } = setupAnimation({ showFps: true })
  expect(context.fillText).toHaveBeenLastCalledWith("0 FPS", 10, 30)
  frame(20)
  expect(context.fillText).toHaveBeenLastCalledWith("50 FPS", 10, 30)
})

test("starts, stops, and resumes without scheduling duplicate frames", () => {
  const { cancelFrame, requestFrame, snow } = setupAnimation()
  expect(requestFrame).toHaveBeenCalledTimes(1)
  snow.resume()
  expect(requestFrame).toHaveBeenCalledTimes(1)
  snow.stop()
  snow.stop()
  expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(1)
  snow.resume()
  expect(requestFrame).toHaveBeenCalledTimes(2)
})

test("resuming ignores time spent stopped", () => {
  const { context, frame, now, snow } = setupAnimation()
  snow.stop()
  now.mockReturnValue(3_600_000)
  snow.resume()
  frame(3_600_020)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(52)
})

test("limits movement after a long frame", () => {
  const { context, frame } = setupAnimation()
  frame(3_600_000)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(60)
})

test("redraws paused flakes without moving them and reuses the context after resizing", () => {
  const { canvas, context, resize, snow } = setupAnimation()
  snow.stop()
  context.arc.mockClear()
  snow.draw()
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
  resize(200, 100)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
  expect(canvas.getContext).toHaveBeenCalledExactlyOnceWith("2d")
  expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 200, 100)
})

test.each([
  { count: 4, density: 350 },
  { count: 2, density: 150 },
  { count: 0, density: 0 },
])("rounds the initial density $density to $count flakes", ({ count, density }) => {
  const { context } = setupAnimation({ density })
  expect(context.arc).toHaveBeenCalledTimes(count)
})

test("removes cropped flakes and handles an empty canvas before growing", () => {
  const { context, resize } = setupAnimation({ density: 400 })
  resize(40, 100)
  expect(context.arc).not.toHaveBeenCalled()
  resize(0, 0)
  expect(context.arc).not.toHaveBeenCalled()
  resize(100, 100)
  expect(context.arc).toHaveBeenCalledTimes(4)
})

test.each([0, 0.001, 100_000])(
  "renders only flakes within the bounds at speed %s",
  (flakeSpeed) => {
    const { context, frame } = setupAnimation({ density: 400, flakeDirection: 45, flakeSpeed })

    for (let time = 100; time <= 2000; time += 100) {
      frame(time)
      expect(context.arc.mock.calls.length).toBeGreaterThan(0)

      for (const [x, y] of context.arc.mock.calls) {
        expect(x).toBeGreaterThanOrEqual(-5)
        expect(x).toBeLessThanOrEqual(105)
        expect(y).toBeGreaterThanOrEqual(-5)
        expect(y).toBeLessThanOrEqual(105)
      }
    }
  },
)

test("accepts zero and false options and exposes the new defaults", () => {
  const { canvas, context, snow } = setupAnimation({ density: 0, fillMode: "none" })
  expect(snow).toMatchObject({ density: 0, fillMode: "none" })
  expect(context.arc).not.toHaveBeenCalled()
  const defaults = createSnow(canvas)
  expect(defaults).toMatchObject({ density: 30, fillMode: "instant" })
})

test("exports snow by name and has no default export", () => {
  expect(snowModule.snow).toBeInstanceOf(Function)
  expect("default" in snowModule).toBe(false)
})

test("uses the 1.0 option names and defaults, without the old names", () => {
  const { canvas } = setupAnimation()
  const animation = createSnow(canvas)
  expect(animation).toMatchObject({
    density: 30,
    fillMode: "instant",
    flakeColor: "rgba(255,255,255,0.9)",
    flakeDirection: 0,
    flakeDirectionDeviation: 5,
    flakeSize: 10,
    flakeSizeDeviation: 2,
    flakeSpeed: 150,
    flakeSpeedDeviation: 10,
    showFps: false,
  })

  for (const oldName of [
    "meanSize",
    "sdSize",
    "meanSpeed",
    "sdSpeed",
    "meanAngle",
    "sdAngle",
    "color",
    "autoFill",
    "isFpsShown",
  ]) {
    expect(animation).not.toHaveProperty(oldName)
  }
})

test("fillMode none starts empty and instant fills at startup", () => {
  expect(setupAnimation({ fillMode: "none" }).context.arc).not.toHaveBeenCalled()
  expect(setupAnimation({ fillMode: "instant" }).context.arc).toHaveBeenCalledTimes(1)
})

test("rejects a canvas without a 2D context", () => {
  const { canvas } = setupAnimation()
  canvas.getContext.mockReturnValue(null)
  expect(() => createSnow(canvas)).toThrow("Could not fetch canvas' context.")
})

test("preserves existing flakes when fractional counts round differently after growth", () => {
  const { context, resize } = setupAnimation({ density: 150 })
  resize(200, 100)
  expect(context.arc).toHaveBeenCalledTimes(3)
  expect(context.arc.mock.calls.filter(([x]) => x === 50)).toHaveLength(2)
  expect(context.arc.mock.calls.filter(([x]) => x === 155)).toHaveLength(1)
})

test.each([
  { angle: 0, exitTime: 100, height: 50, width: 100, x: 50, y: 0 },
  { angle: -90, exitTime: 100, height: 100, width: 50, x: 0, y: 50 },
  { angle: 90, exitTime: 600, height: 100, width: 50, x: 50, y: 50 },
  { angle: 180, exitTime: 600, height: 50, width: 100, x: 50, y: 50 },
])(
  "keeps visible flakes after shrinking until they leave at $angle degrees",
  ({ angle, exitTime, height, width }) => {
    const { context, frame, resize, snow } = setupAnimation({ density: 400, flakeDirection: angle })
    snow.density = 0
    resize(width, height)
    expect(context.arc).toHaveBeenCalledTimes(4)
    expect(
      context.arc.mock.calls.every(
        ([flakeX, flakeY, radius]) => flakeX === 50 && flakeY === 50 && radius === 5,
      ),
    ).toBe(true)
    frame(20)
    expect(context.arc).toHaveBeenCalledTimes(4)

    for (let time = 100; time <= exitTime; time += 100) {
      frame(time)
    }

    expect(context.arc).not.toHaveBeenCalled()
  },
)

test("increases density through incoming flakes without filling the visible scene", () => {
  const { context, frame, snow } = setupAnimation()
  snow.density = 400
  context.arc.mockClear()
  snow.draw()
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([50, 50, 5])
  frame(100)
  expect(context.arc).toHaveBeenCalledTimes(1)
  frame(200)
  expect(context.arc.mock.calls.length).toBeGreaterThan(1)
  expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([50, 70, 5])
})

test.each([
  { density: 100, remaining: 1 },
  { density: 0, remaining: 0 },
])("reduces density to $density without removing visible flakes", ({ density, remaining }) => {
  const { context, frame, snow } = setupAnimation({ density: 400 })
  snow.density = density
  snow.flakeColor = "blue"
  /** @type {string[]} */
  const colors = []
  context.fill.mockImplementation(() => {
    colors.push(context.fillStyle)
  })
  context.arc.mockClear()
  snow.draw()
  expect(context.arc).toHaveBeenCalledTimes(4)

  for (let time = 100; time <= 500; time += 100) {
    colors.length = 0
    frame(time)
    expect(colors.filter((color) => color === "rgba(255,255,255,0.9)")).toHaveLength(4)
  }

  colors.length = 0
  frame(600)
  expect(colors).not.toContain("rgba(255,255,255,0.9)")
  expect(context.arc).toHaveBeenCalledTimes(remaining)
})

test("draws old and incoming colors separately during a transition", () => {
  const { context, frame, snow } = setupAnimation()
  /** @type {string[]} */
  const colors = []
  context.fill.mockImplementation(() => {
    colors.push(context.fillStyle)
  })
  snow.flakeColor = "blue"
  snow.density = 200
  frame(100)
  frame(200)
  colors.length = 0
  frame(300)
  expect(context.arc).toHaveBeenCalledTimes(2)
  expect(colors).toEqual(["rgba(255,255,255,0.9)", "blue"])
})

test("starts arrivals after changing stationary settings without prepopulating", () => {
  const { context, frame, snow } = setupAnimation({ fillMode: "none", flakeSpeed: 0 })
  snow.flakeSpeed = 100
  snow.draw()
  expect(context.arc).not.toHaveBeenCalled()
  frame(100)
  expect(context.arc).not.toHaveBeenCalled()

  for (let time = 200; time <= 500; time += 100) {
    frame(time)
  }

  expect(context.arc).toHaveBeenCalledTimes(1)
})

test("does not queue arrivals when density is raised and lowered while paused", () => {
  const { context, frame, snow } = setupAnimation({ density: 0, fillMode: "none" })
  snow.stop()
  snow.density = 1000
  snow.draw()
  snow.density = 0
  snow.draw()
  snow.resume()

  for (let time = 100; time <= 1000; time += 100) {
    frame(time)
    expect(context.arc).not.toHaveBeenCalled()
  }
})

test("preserves survivor drawing order and appends independent new arrivals", () => {
  const samples = [0.5, 0.5, 0.1, 0.99, 0.5, 0.5]
  let sampleIndex = 0

  const { context, frame, snow } = setupAnimation({ density: 300 }, () => {
    const value = samples[sampleIndex % samples.length]
    sampleIndex += 1

    return value
  })

  vi.spyOn(Math, "random").mockReturnValue(0.5)
  /** @type {string[]} */
  const colors = []
  context.fill.mockImplementation(() => {
    colors.push(context.fillStyle)
  })
  snow.flakeColor = "blue"
  frame(100)
  colors.length = 0
  frame(200)
  expect(context.arc.mock.calls.filter(([x, y]) => x === 50 && y === 70)).toHaveLength(2)
  expect(colors).toEqual(["rgba(255,255,255,0.9)", "rgba(255,255,255,0.9)", "blue"])
})

test("keeps arrivals going at the lower density while old dense snow leaves", () => {
  const { context, frame, resize, snow } = setupAnimation({ density: 1000 })
  resize(1000, 1000)
  snow.density = 10
  snow.flakeColor = "blue"
  /** @type {string[]} */
  const colors = []
  context.fill.mockImplementation(() => {
    colors.push(context.fillStyle)
  })

  for (let time = 100; time <= 500; time += 100) {
    colors.length = 0
    frame(time)
  }

  expect(colors.filter((color) => color === "rgba(255,255,255,0.9)")).toHaveLength(1000)
  expect(colors).toContain("blue")
})

test.each([
  {
    arrivalMin: 160,
    flakeSpeed: 100,
    populationMax: 190,
    populationMin: 145,
    speedMax: 140,
    speedMin: 120,
  },
  {
    arrivalMin: 110,
    flakeSpeed: 0,
    populationMax: 120,
    populationMin: 80,
    speedMax: 100,
    speedMin: 70,
  },
  {
    arrivalMin: 75,
    flakeSpeed: -100,
    populationMax: 45,
    populationMin: 20,
    speedMax: 75,
    speedMin: 40,
  },
])(
  "preserves the visible speed distribution with mean $flakeSpeed",
  ({ flakeSpeed, populationMin, populationMax, speedMin, speedMax, arrivalMin }) => {
    let seed = 1729

    const { context, frame, resize } = setupAnimation(
      { density: 200, fillMode: "none", flakeSpeed, flakeSpeedDeviation: 100 },
      () => {
        seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296

        return seed / 4_294_967_296
      },
    )

    resize(1000, 1000)
    /** @type {Map<string, number>} */
    let previous = new Map()
    const measuredArrivals = new Set()
    let visibleSpeedSum = 0
    let visibleSpeedCount = 0
    let arrivalSpeedSum = 0
    let arrivalSpeedCount = 0
    let populationSum = 0
    let populationSamples = 0

    for (let time = 100; time <= 150_000; time += 100) {
      frame(time)
      /** @type {Map<string, number>} */
      const current = new Map()

      for (const call of context.arc.mock.calls) {
        const x = Number(call[0]).toFixed(6)
        const y = Number(call[1])
        current.set(x, y)
        const previousY = previous.get(x)

        if (previousY !== undefined) {
          const speed = (y - previousY) * 10

          if (!measuredArrivals.has(x)) {
            measuredArrivals.add(x)
            arrivalSpeedSum += speed
            arrivalSpeedCount += 1
          }

          if (time > 50_000) {
            visibleSpeedSum += speed
            visibleSpeedCount += 1
          }
        }
      }

      if (time > 50_000) {
        populationSum += current.size
        populationSamples += 1
      }

      previous = current
      vi.clearAllMocks()
    }

    // Positive normal probabilities are 84.13%, 50%, and 15.87%; conditional means are 128.76, 79.79, and 52.51.
    expect(populationSum / populationSamples).toBeGreaterThan(populationMin)
    expect(populationSum / populationSamples).toBeLessThan(populationMax)
    expect(visibleSpeedSum / visibleSpeedCount).toBeGreaterThan(speedMin)
    expect(visibleSpeedSum / visibleSpeedCount).toBeLessThan(speedMax)
    expect(arrivalSpeedSum / arrivalSpeedCount).toBeGreaterThan(arrivalMin)
  },
)

test.each([
  { angle: 0, flakeDirectionDeviation: 0, height: 1000, size: 10, width: 1000 },
  { angle: 90, flakeDirectionDeviation: 0, height: 500, size: 80, width: 2000 },
  { angle: 60, flakeDirectionDeviation: 0, height: 500, size: 80, width: 2000 },
  { angle: 120, flakeDirectionDeviation: 0, height: 1000, size: 10, width: 1000 },
  { angle: 0, flakeDirectionDeviation: 90, height: 1000, size: 10, width: 1000 },
])(
  "maintains average density at $angle degrees with size $size",
  ({ angle, flakeDirectionDeviation, size, width, height }) => {
    let seed = 937

    const { context, frame, resize } = setupAnimation(
      {
        density: 200,
        fillMode: "none",
        flakeDirection: angle,
        flakeDirectionDeviation,
        flakeSize: size,
      },
      () => {
        seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296

        return seed / 4_294_967_296
      },
    )

    resize(width, height)
    let populationSum = 0
    let sampleCount = 0

    for (let time = 100; time <= 150_000; time += 100) {
      frame(time)

      if (time > 50_000) {
        populationSum += context.arc.mock.calls.length
        sampleCount += 1
      }

      vi.clearAllMocks()
    }

    expect(populationSum / sampleCount).toBeGreaterThan(170)
    expect(populationSum / sampleCount).toBeLessThan(230)
  },
)

test("does not wrap or restart flakes after density reaches zero", () => {
  const { context, frame, snow } = setupAnimation({ density: 400 })
  snow.density = 0

  for (let time = 100; time <= 500; time += 100) {
    frame(time)
    expect(context.arc).toHaveBeenCalledTimes(4)
  }

  for (let time = 600; time <= 5000; time += 100) {
    frame(time)
    expect(context.arc).not.toHaveBeenCalled()
  }
})

/**
 * Run a seeded animation with fixed frame intervals.
 * @param {number} frameStep Frame duration in milliseconds.
 */
function simulateArrivalFrames(frameStep) {
  let seed = 574

  const { context, frame } = setupAnimation({ density: 10_000, fillMode: "none" }, () => {
    seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296

    return seed / 4_294_967_296
  })

  for (let time = frameStep; time <= 2000; time += frameStep) {
    frame(time)
  }

  return context.arc.mock.calls
}

test("keeps arrival timing independent of frame cadence", () => {
  const fineFrames = simulateArrivalFrames(20)
  const coarseFrames = simulateArrivalFrames(100)
  expect(fineFrames.length).toBeGreaterThan(0)
  expect(coarseFrames).toHaveLength(fineFrames.length)

  for (let index = 0; index < fineFrames.length; index += 1) {
    expect(coarseFrames[index][0]).toBeCloseTo(Number(fineFrames[index][0]), 8)
    expect(coarseFrames[index][1]).toBeCloseTo(Number(fineFrames[index][1]), 8)
  }
})

test("prefills the same spatial distribution as incoming flakes", () => {
  let populationSum = 0

  for (let run = 1; run <= 100; run += 1) {
    let seed = run * 17_497

    const { canvas, context, frame, snow } = setupAnimation({ density: 0 }, () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296

      return seed / 4_294_967_296
    })

    snow.stop()
    Object.assign(canvas, { clientWidth: 1000, width: 1000 })
    createSnow(canvas, {
      density: 200,
      flakeDirection: 0,
      flakeDirectionDeviation: 0,
      flakeSize: 100,
      flakeSizeDeviation: 0,
      flakeSpeed: 100,
      flakeSpeedDeviation: 0,
    })

    for (let time = 100; time <= 500; time += 100) {
      frame(time)
    }

    populationSum += context.arc.mock.calls.length
    vi.clearAllMocks()
  }

  expect(populationSum / 100).toBeGreaterThan(18)
  expect(populationSum / 100).toBeLessThan(22)
})

test.each([
  "flakeSize",
  "flakeSizeDeviation",
  "flakeSpeed",
  "flakeSpeedDeviation",
  "flakeDirection",
  "flakeDirectionDeviation",
])("rejects nonfinite %s instead of stalling the emitter", (key) => {
  expect(() => setupAnimation({ [key]: Number.POSITIVE_INFINITY })).toThrow(
    `${key} must be a finite number`,
  )
})

test("handles a zero random draw without a zero-length arrival loop", () => {
  let firstDraw = true

  const { context, frame } = setupAnimation({ fillMode: "none" }, () => {
    if (firstDraw) {
      firstDraw = false

      return 0
    }

    return 0.5
  })

  for (let time = 100; time <= 500; time += 100) {
    frame(time)
  }

  expect(context.arc).toHaveBeenCalledTimes(1)
})

test("rejects an overflowing arrival rate before entering the sampling loop", () => {
  const { frame, resize } = setupAnimation({
    density: 1_000_000,
    fillMode: "none",
    flakeSpeed: Number.MAX_VALUE,
  })

  resize(1000, 1000)
  expect(() => {
    frame(100)
  }).toThrow("Snowfall arrival rate must be finite")
})

test("reads the canvas size only after the resize observer reports a change", () => {
  const resizeObserver = vi.fn(
    class {
      observe = vi.fn()
    },
  )

  vi.stubGlobal("ResizeObserver", resizeObserver)
  const { canvas, context, frame } = setupAnimation()
  canvas.clientWidth = 200
  frame(20)
  expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 100, 100)
  resizeObserver.mock.calls[0][0]()
  frame(40)
  expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 200, 100)
})
