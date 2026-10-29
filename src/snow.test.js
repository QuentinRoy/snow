import { afterEach, expect, test, vi } from "vite-plus/test"
import createSnow from "./snow"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** @param {Parameters<typeof createSnow>[1]} options Initial settings. */
const setupAnimation = (options = {}) => {
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
  const now = vi.spyOn(Date, "now").mockReturnValue(0)
  vi.spyOn(Math, "random").mockReturnValue(0.5)

  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    fillText: vi.fn(),
    moveTo: vi.fn(),
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
    meanSize: 10,
    meanSpeed: 100,
    sdAngle: 0,
    sdSize: 0,
    sdSpeed: 0,
    ...options,
  })

  /** @param {number} time Frame time in milliseconds. */
  const frame = (time) => {
    context.arc.mockClear()
    now.mockReturnValue(time)
    nextFrame?.(0)
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
  { count: 8, height: 100, newX: 150, newY: 50, width: 200 },
  { count: 8, height: 200, newX: 50, newY: 150, width: 100 },
  { count: 4, height: 50, newX: 150, newY: 25, width: 200 },
])(
  "preserves overlap and fills exposed space at $width by $height",
  ({ count, height, newX, newY, width }) => {
    const { context, resize } = setupAnimation({ density: 400 })
    resize(width, height)
    expect(context.arc).toHaveBeenCalledTimes(count)
    expect(context.arc.mock.calls).toContainEqual([50, 50, 5, 0, 2 * Math.PI])
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
  { angle: 0, x: 50, y: 0 },
  { angle: 90, x: 100, y: 50 },
  { angle: -90, x: 0, y: 50 },
  { angle: 180, x: 50, y: 100 },
])("recycles flakes at $angle degrees without changing their population", ({ angle, x, y }) => {
  const { context, frame } = setupAnimation({ meanAngle: angle })

  for (let time = 100; time <= 600; time += 100) {
    frame(time)
    expect(context.arc).toHaveBeenCalledTimes(1)
  }

  expect(context.arc.mock.calls[0][0]).toBeCloseTo(x)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(y)
})

test("lets snow enter naturally at startup when autoFill is disabled", () => {
  const { context, frame } = setupAnimation({ autoFill: false })
  expect(context.arc).not.toHaveBeenCalled()

  for (let time = 100; time <= 500; time += 100) {
    frame(time)
    expect(context.arc).not.toHaveBeenCalled()
  }

  frame(600)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(0)
})

test("lets snow enter new space naturally after resizing when autoFill is disabled", () => {
  const { context, frame, resize, snow } = setupAnimation()
  snow.autoFill = false
  resize(200, 100)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])

  for (let time = 100; time <= 600; time += 100) {
    frame(time)
  }

  expect(context.arc).toHaveBeenCalledTimes(2)
})

test("applies size, speed, direction, and color changes to existing flakes", () => {
  const { context, frame, snow } = setupAnimation()
  snow.meanSize = 20
  snow.meanSpeed = 200
  snow.meanAngle = -90
  snow.color = "blue"
  frame(100)
  expect(context.arc.mock.calls[0][0]).toBeCloseTo(70)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(50)
  expect(context.arc.mock.calls[0][2]).toBe(10)
  expect(context.fillStyle).toBe("blue")
})

test("fills pending flakes when autoFill is enabled without moving them", () => {
  const { context, snow } = setupAnimation({ autoFill: false, meanSpeed: 0 })
  snow.autoFill = true
  snow.draw()
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
})

test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
  "rejects invalid density %s with a clear error",
  (density) => {
    expect(() => setupAnimation({ density })).toThrow(
      "density must be a finite, nonnegative number",
    )
  },
)

test("keeps negative sampled speeds stationary and skips nonpositive sizes", () => {
  const { context, frame, snow } = setupAnimation({ meanSpeed: -100 })
  frame(100)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
  snow.meanSize = -10
  frame(200)
  expect(context.arc).not.toHaveBeenCalled()
})

test("shows a finite frame rate before the first animation frame", () => {
  const { context, frame } = setupAnimation({ isFpsShown: true })
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

test("adjusts the population when density changes and rounds fractional counts", () => {
  const { context, snow } = setupAnimation()
  snow.density = 350
  context.arc.mockClear()
  snow.draw()
  expect(context.arc).toHaveBeenCalledTimes(4)
  snow.density = 150
  context.arc.mockClear()
  snow.draw()
  expect(context.arc).toHaveBeenCalledTimes(2)
  snow.density = 0
  context.arc.mockClear()
  snow.draw()
  expect(context.arc).not.toHaveBeenCalled()
})

test("removes flakes outside a shrunken canvas and fills the remaining area", () => {
  const { context, resize } = setupAnimation({ density: 400 })
  resize(40, 100)
  expect(context.arc).toHaveBeenCalledTimes(2)
  expect(context.arc.mock.calls).toEqual([
    [20, 50, 5, 0, 2 * Math.PI],
    [20, 50, 5, 0, 2 * Math.PI],
  ])
  resize(0, 0)
  expect(context.arc).not.toHaveBeenCalled()
  resize(100, 100)
  expect(context.arc).toHaveBeenCalledTimes(4)
})

test.each([0, 0.001, 100_000])("keeps density independent of speed %s", (meanSpeed) => {
  const { context, frame } = setupAnimation({ density: 400, meanAngle: 45, meanSpeed })

  for (let time = 100; time <= 2000; time += 100) {
    frame(time)
    expect(context.arc).toHaveBeenCalledTimes(4)

    for (const [x, y] of context.arc.mock.calls) {
      expect(x).toBeGreaterThanOrEqual(-5)
      expect(x).toBeLessThanOrEqual(105)
      expect(y).toBeGreaterThanOrEqual(-5)
      expect(y).toBeLessThanOrEqual(105)
    }
  }
})

test("accepts zero and false options and exposes the new defaults", () => {
  const { canvas, context, snow } = setupAnimation({ autoFill: false, density: 0 })
  expect(snow).toMatchObject({ autoFill: false, density: 0 })
  expect(context.arc).not.toHaveBeenCalled()
  const defaults = createSnow(canvas)
  expect(defaults).toMatchObject({ autoFill: true, density: 30 })
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
  expect(context.arc.mock.calls.filter(([x]) => x === 150)).toHaveLength(1)
})
