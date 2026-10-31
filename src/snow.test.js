import { afterEach, expect, test, vi } from "vite-plus/test"
import * as snowModule from "./snow.ts"
import { snow as createSnow } from "./snow.ts"

/**
 * @typedef {object} FakeEntry
 * @property {{ height: number, width: number, x: number, y: number }} contentRect Displayed size.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Create a fake canvas and a manually advanced animation.
 * @param {Parameters<typeof createSnow>[1]} [options] Initial settings.
 * @param {() => number} [random] Random source.
 * @param {number} [pixelRatio] Stubbed `devicePixelRatio`.
 * @param {typeof createSnow} [factory] Factory to test.
 */
function setupAnimation(options, random, pixelRatio = 1, factory = createSnow) {
  vi.stubGlobal("devicePixelRatio", pixelRatio)
  /** @type {Array<{ listener: (() => void) | undefined }>} */
  const queries = []
  vi.stubGlobal("matchMedia", () => {
    /** @type {{ listener: (() => void) | undefined }} */
    const query = { listener: undefined }
    queries.unshift(query)

    return {
      /** @param {string} _type Event type. @param {() => void} listener Event listener. */
      addEventListener: (_type, listener) => {
        query.listener = listener
      },
      removeEventListener: () => {
        query.listener = undefined
      },
    }
  })

  /** @type {FakeResizeObserver[]} */
  const observers = []

  class FakeResizeObserver {
    /** @param {(entries: FakeEntry[]) => void} onResize Resize callback. */
    constructor(onResize) {
      this.onResize = onResize
      /** @type {import("vite-plus/test").Mock<(target: unknown, options?: { box?: string }) => void>} */
      this.observe = vi.fn()
      this.disconnect = vi.fn()
      observers.push(this)
    }

    /** @param {FakeEntry[]} entries Entries to report. */
    trigger(entries) {
      this.onResize(entries)
    }
  }

  vi.stubGlobal("ResizeObserver", FakeResizeObserver)

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
  vi.spyOn(Math, "random").mockImplementation(random ?? (() => 0.5))

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

  const style = {
    getPropertyPriority: () => "",
    padding: "0px",
    position: "static",
    /** @param {string} name Property name. @param {string} value Property value. */
    setProperty(name, value) {
      Reflect.set(style, name, value)
    },
  }

  const canvas = {
    getContext: vi.fn().mockReturnValue(context),
    height: 100,
    remove: vi.fn(),
    setAttribute: vi.fn(),
    style: { height: "", transform: "", width: "" },
    width: 100,
  }

  const container = {
    append: vi.fn(),
    clientHeight: 100,
    clientWidth: 100,
    isConnected: true,
    localName: "div",
    ownerDocument: { createElement: vi.fn().mockReturnValue(canvas) },
    style,
  }

  vi.stubGlobal("getComputedStyle", (target) => ({
    height: `${container.clientHeight * (target === canvas ? Number(canvas.style.height.replace("%", "")) / 100 : 1)}px`,
    position: target === container ? style.position : "absolute",
    width: `${container.clientWidth * (target === canvas ? Number(canvas.style.width.replace("%", "")) / 100 : 1)}px`,
  }))

  const snow = factory(container, {
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

  let size = { height: container.clientHeight, width: container.clientWidth }

  /**
   * Report a new displayed size through the resize observer.
   * @param {number} width Displayed width.
   * @param {number} height Displayed height.
   */
  const resize = (width, height) => {
    size = { height, width }
    container.clientWidth = width
    container.clientHeight = height
    const ratio = Number(canvas.style.width.replace("%", "")) / 100
    context.arc.mockClear()
    observers[0].trigger([
      {
        contentRect: { height: height * ratio, width: width * ratio, x: 0, y: 0 },
      },
    ])
  }

  /** Redraw at the current size, as an unchanged resize would. */
  const redraw = () => {
    resize(size.width, size.height)
  }

  return {
    cancelFrame,
    canvas,
    container,
    context,
    frame,
    now,
    observers,
    queries,
    redraw,
    requestFrame,
    resize,
    snow,
  }
}

/**
 * A deterministic random source, so statistical tests do not flake.
 * @param {number} seed Starting state.
 */
function seededRandom(seed) {
  let state = seed

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296

    return state / 4_294_967_296
  }
}

/**
 * Record the fill color of every flake drawn from now on.
 * @param {ReturnType<typeof setupAnimation>["context"]} context Fake context.
 */
function recordFillColors(context) {
  /** @type {string[]} */
  const colors = []
  context.fill.mockImplementation(() => {
    colors.push(context.fillStyle)
  })

  return colors
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
  const { context, frame, resize } = setupAnimation({}, undefined, 2)
  frame(20)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 3)).toEqual([50, 52, 5])
  expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0)

  resize(200, 100)
  expect(context.arc).toHaveBeenCalledTimes(2)
  expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0)
})

test("sizes the canvas resolution from its displayed size times the pixel ratio", () => {
  const { canvas, resize } = setupAnimation({}, undefined, 2)
  expect([canvas.width, canvas.height]).toEqual([200, 200])

  resize(150.5, 80)
  expect([canvas.width, canvas.height]).toEqual([301, 160])
})

test.each([
  { bitmap: [188, 100], ratio: 1.25 },
  { bitmap: [226, 120], ratio: 1.5 },
  { bitmap: [301, 160], ratio: 2 },
])("normalizes observed canvas coordinates at density $ratio", ({ bitmap, ratio }) => {
  const { canvas, context, resize } = setupAnimation({ paused: true }, undefined, ratio)
  resize(150.5, 80)
  expect([canvas.width, canvas.height]).toEqual(bitmap)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
})

test("observes only its canvas and restores automatic positioning on disposal", () => {
  const { canvas, container, observers, snow } = setupAnimation()
  expect(observers).toHaveLength(1)
  expect(observers[0].observe).toHaveBeenCalledExactlyOnceWith(canvas)
  expect(container.style).toMatchObject({ padding: "0px", position: "relative" })
  snow.dispose()
  expect(container.style).toMatchObject({ padding: "0px", position: "static" })
})

test("updates pixel density while paused without moving flakes", () => {
  const { canvas, context, frame, queries, requestFrame, snow } = setupAnimation({}, undefined, 1)

  frame(20)
  snow.paused = true
  const requests = requestFrame.mock.calls.length
  context.arc.mockClear()
  vi.stubGlobal("devicePixelRatio", 2)
  queries[0]?.listener?.()
  expect([canvas.width, canvas.height]).toEqual([200, 200])
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 52])
  expect(requestFrame).toHaveBeenCalledTimes(requests)
})

test("tracks successive pixel-density changes while playing", () => {
  const { canvas, context, frame, queries } = setupAnimation({}, undefined, 1)
  frame(20)
  context.arc.mockClear()
  vi.stubGlobal("devicePixelRatio", 2)
  queries[0]?.listener?.()
  expect([canvas.width, canvas.height]).toEqual([200, 200])
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 52])
  vi.stubGlobal("devicePixelRatio", 3)
  queries[0]?.listener?.()
  expect([canvas.width, canvas.height]).toEqual([300, 300])
  frame(40)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 54])
})

test("stops pixel-density updates on disposal, including queued notifications", () => {
  const { canvas, context, queries, snow } = setupAnimation({ paused: true }, undefined, 1)
  const queuedNotification = queries[0]?.listener
  snow.dispose()
  expect(queries[0]?.listener).toBeUndefined()
  context.arc.mockClear()
  vi.stubGlobal("devicePixelRatio", 2)
  queuedNotification?.()
  expect([canvas.width, canvas.height]).toEqual([100, 100])
  expect(context.arc).not.toHaveBeenCalled()
})

test("preserves a detached scene across a pixel-density change", () => {
  const { canvas, container, context, frame, queries, resize, snow } = setupAnimation(
    {},
    undefined,
    1,
  )

  frame(20)
  snow.paused = true
  container.isConnected = false
  vi.stubGlobal("devicePixelRatio", 2)
  queries[0]?.listener?.()
  expect([canvas.width, canvas.height]).toEqual([100, 100])
  container.isConnected = true
  resize(100, 100)
  expect([canvas.width, canvas.height]).toEqual([200, 200])
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 52])
})

test("watches density before the first resize notification", () => {
  const { canvas, queries } = setupAnimation({ paused: true })
  vi.stubGlobal("devicePixelRatio", 2)
  queries[0]?.listener?.()
  expect([canvas.width, canvas.height]).toEqual([200, 200])
})

test("keeps CSS sizing responsive while updating its bitmap on observer delivery", () => {
  const { canvas, container, context, resize } = setupAnimation({ paused: true })
  expect(container.append).toHaveBeenCalledExactlyOnceWith(canvas)
  expect(canvas.setAttribute).toHaveBeenCalledWith("aria-hidden", "true")
  container.clientWidth = 200
  expect([canvas.width, canvas.height]).toEqual([100, 100])
  resize(200, 150)
  expect([canvas.width, canvas.height]).toEqual([200, 150])
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
})

test("handles density changing before the pending resize notification", () => {
  const { canvas, context, resize, snow } = setupAnimation({ paused: true })
  snow.density = 0
  vi.stubGlobal("devicePixelRatio", 2)
  resize(150, 100)
  expect([canvas.width, canvas.height]).toEqual([300, 200])
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 50])
  resize(150, 100)
  expect([canvas.width, canvas.height]).toEqual([300, 200])
  expect(context.arc).toHaveBeenCalledTimes(1)
})

test("redraws after a resize without advancing time", () => {
  const { context, frame, resize } = setupAnimation()
  frame(20)
  resize(200, 100)
  expect(context.arc.mock.calls[0].slice(0, 2)).toEqual([50, 52])
  expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 200, 100)
})

test.each([
  { count: 2, fillMode: "instant" },
  { count: 1, fillMode: "none" },
])("resizing while paused keeps flakes put with fillMode $fillMode", ({ count, fillMode }) => {
  const { context, frame, resize, snow } = setupAnimation({ fillMode: "instant" })
  frame(20)
  snow.paused = true
  snow.fillMode = fillMode
  resize(200, 100)
  expect(context.arc).toHaveBeenCalledTimes(count)
  expect(context.arc.mock.calls.filter(([x, y]) => x === 50 && y === 52)).toHaveLength(1)
})

test("no longer exposes draw", () => {
  const { snow } = setupAnimation()
  expect(snow).not.toHaveProperty("draw")
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
  const { context, frame, redraw, snow } = setupAnimation()
  snow.flakeSize = 20
  snow.flakeSpeed = 200
  snow.flakeDirection = -90
  snow.flakeColor = "blue"
  redraw()
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
  const { context, redraw, resize, snow } = setupAnimation({ fillMode: "none", flakeSpeed: 0 })
  snow.fillMode = "instant"
  redraw()
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

test("pauses and resumes without scheduling duplicate frames", () => {
  const { cancelFrame, requestFrame, snow } = setupAnimation()
  expect(snow.paused).toBe(false)
  expect(requestFrame).toHaveBeenCalledTimes(1)
  snow.paused = false
  expect(requestFrame).toHaveBeenCalledTimes(1)
  snow.paused = true
  snow.paused = true
  expect(snow.paused).toBe(true)
  expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(1)
  snow.paused = false
  snow.paused = false
  expect(snow.paused).toBe(false)
  expect(requestFrame).toHaveBeenCalledTimes(2)
})

test("keeps the last frame visible while paused", () => {
  const { context, frame, snow } = setupAnimation()
  frame(20)
  snow.paused = true
  expect(context.clearRect).toHaveBeenCalledTimes(2)
  expect(context.arc).toHaveBeenCalledTimes(1)
})

test("resuming ignores time spent paused", () => {
  const { context, frame, now, snow } = setupAnimation()
  snow.paused = true
  now.mockReturnValue(3_600_000)
  snow.paused = false
  frame(3_600_020)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(52)
})

test("draws the first frame without scheduling another when starting paused", () => {
  const { cancelFrame, context, frame, requestFrame, snow } = setupAnimation({ paused: true })
  expect(snow.paused).toBe(true)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(requestFrame).not.toHaveBeenCalled()

  snow.paused = false
  expect(requestFrame).toHaveBeenCalledTimes(1)
  frame(20)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(52)
  expect(cancelFrame).not.toHaveBeenCalled()
})

test("no longer exposes stop or resume", () => {
  const { snow } = setupAnimation()
  expect(snow).not.toHaveProperty("stop")
  expect(snow).not.toHaveProperty("resume")
})

test("limits movement after a long frame", () => {
  const { context, frame } = setupAnimation()
  frame(3_600_000)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(60)
})

test("redraws paused flakes without moving them and reuses the context after resizing", () => {
  const { canvas, context, redraw, resize, snow } = setupAnimation()
  snow.paused = true
  redraw()
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

test("keeps its flakes when the canvas leaves the page and comes back", () => {
  const { container, context, resize, snow } = setupAnimation({ density: 400 })
  expect(context.arc).toHaveBeenCalledTimes(4)
  // Refilling is off, so only surviving flakes can reappear.
  snow.fillMode = "none"

  // Browsers report a detached canvas as empty.
  container.isConnected = false
  resize(0, 0)
  container.isConnected = true
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
  const { container, context, snow } = setupAnimation({ density: 0, fillMode: "none" })
  expect(snow).toMatchObject({ density: 0, fillMode: "none" })
  expect(context.arc).not.toHaveBeenCalled()
  const defaults = createSnow(container)
  expect(defaults).toMatchObject({ density: 30, fillMode: "instant" })
})

test("exports snow by name and has no default export", () => {
  expect(snowModule.snow).toBeInstanceOf(Function)
  expect("default" in snowModule).toBe(false)
})

test("uses the 1.0 option names and defaults, without the old names", () => {
  const { container } = setupAnimation()
  const animation = createSnow(container)
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
  const { canvas, container } = setupAnimation()
  canvas.getContext.mockReturnValue(null)
  expect(() => createSnow(container)).toThrow("Could not fetch canvas' context.")
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
  const { context, frame, redraw, snow } = setupAnimation()
  snow.density = 400
  redraw()
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
  const { context, frame, redraw, snow } = setupAnimation({ density: 400 })
  snow.density = density
  snow.flakeColor = "blue"
  const colors = recordFillColors(context)
  redraw()
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
  const colors = recordFillColors(context)
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
  const { context, frame, redraw, snow } = setupAnimation({ fillMode: "none", flakeSpeed: 0 })
  snow.flakeSpeed = 100
  redraw()
  expect(context.arc).not.toHaveBeenCalled()
  frame(100)
  expect(context.arc).not.toHaveBeenCalled()

  for (let time = 200; time <= 500; time += 100) {
    frame(time)
  }

  expect(context.arc).toHaveBeenCalledTimes(1)
})

test("does not queue arrivals when density is raised and lowered while paused", () => {
  const { context, frame, redraw, snow } = setupAnimation({ density: 0, fillMode: "none" })
  snow.paused = true
  snow.density = 1000
  redraw()
  snow.density = 0
  redraw()
  snow.paused = false

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
  const colors = recordFillColors(context)
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
  const colors = recordFillColors(context)

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
    const { context, frame, resize } = setupAnimation(
      { density: 200, fillMode: "none", flakeSpeed, flakeSpeedDeviation: 100 },
      seededRandom(1729),
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
    const { context, frame, resize } = setupAnimation(
      {
        density: 200,
        fillMode: "none",
        flakeDirection: angle,
        flakeDirectionDeviation,
        flakeSize: size,
      },
      seededRandom(937),
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
  const { context, frame } = setupAnimation(
    { density: 10_000, fillMode: "none" },
    seededRandom(574),
  )

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
    const { container, context, frame, snow } = setupAnimation(
      { density: 0 },
      seededRandom(run * 17_497),
    )

    snow.paused = true
    container.clientWidth = 1000
    createSnow(container, {
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

test("disposing removes the canvas and stops frames and observation", () => {
  const { canvas, container, cancelFrame, context, observers, snow } = setupAnimation()
  snow.dispose()
  expect(canvas.remove).toHaveBeenCalledOnce()
  expect(container.style.position).toBe("static")
  expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(1)
  expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 100, 100)
})

test("disposing a paused animation does not cancel a frame", () => {
  const { cancelFrame, context, snow } = setupAnimation({ paused: true })
  snow.dispose()
  expect(cancelFrame).not.toHaveBeenCalled()
  expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 100, 100)
})

test("does nothing after disposal", () => {
  const { cancelFrame, context, observers, requestFrame, resize, snow } = setupAnimation()
  snow.dispose()
  context.clearRect.mockClear()
  requestFrame.mockClear()
  cancelFrame.mockClear()

  expect(() => {
    snow.dispose()
    snow.paused = false
    snow.paused = true
    snow.paused = false
    resize(200, 200)
  }).not.toThrow()

  expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  expect(requestFrame).not.toHaveBeenCalled()
  expect(cancelFrame).not.toHaveBeenCalled()
  expect(context.clearRect).not.toHaveBeenCalled()
  expect(context.arc).not.toHaveBeenCalled()
})

test("disposes through Symbol.dispose", () => {
  const { cancelFrame, observers, snow } = setupAnimation()
  snow[Symbol.dispose]()
  expect(cancelFrame).toHaveBeenCalledTimes(1)
  expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
})

test("initializes a missing disposal symbol and disposes through it", async () => {
  const nativeSymbol = Symbol
  /** @param {string} description Symbol description. */
  const symbolWithoutDispose = (description) => nativeSymbol(description)
  Object.setPrototypeOf(symbolWithoutDispose, nativeSymbol)
  Object.defineProperty(symbolWithoutDispose, "dispose", { value: undefined, writable: true })
  vi.stubGlobal("Symbol", symbolWithoutDispose)
  vi.resetModules()

  const { snow: factory } = await import("./snow.ts")
  expect(Symbol.dispose.description).toBe("Symbol.dispose")

  const { cancelFrame, context, observers, snow } = setupAnimation(undefined, undefined, 1, factory)

  snow[Symbol.dispose]()
  snow.dispose()
  expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(1)
  expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, 100, 100)
})

test("preserves an existing disposal symbol when imported without a DOM", async () => {
  const nativeSymbol = Symbol
  const existing = nativeSymbol("existing disposal")
  /** @param {string} description Symbol description. */
  const symbolWithDispose = (description) => nativeSymbol(description)
  Object.setPrototypeOf(symbolWithDispose, nativeSymbol)
  Object.defineProperty(symbolWithDispose, "dispose", { value: existing, writable: true })
  vi.stubGlobal("Symbol", symbolWithDispose)
  vi.stubGlobal("document", undefined)
  vi.resetModules()

  const { snow: factory } = await import("./snow.ts")
  expect(Symbol.dispose).toBe(existing)
  const { cancelFrame, observers, snow } = setupAnimation(undefined, undefined, 1, factory)
  snow[Symbol.dispose]()
  expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(1)
  expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
})

test("rejects canvas inputs before creating or attaching anything", () => {
  const { container } = setupAnimation()
  container.localName = "canvas"
  container.ownerDocument.createElement.mockClear()
  expect(() => createSnow(container)).toThrow("snow() expects a container, not a canvas.")
  expect(container.ownerDocument.createElement).not.toHaveBeenCalled()
})

test("disposal preserves a consumer's later positioning change", () => {
  const { container, snow } = setupAnimation()
  container.style.position = "absolute"
  snow.dispose()
  expect(container.style.position).toBe("absolute")
})
