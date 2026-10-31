/// <reference types="@vitest/browser-playwright" />
import { afterEach, expect, test, vi } from "vite-plus/test"
import { cdp } from "vite-plus/test/browser"
import { SnowElement } from "./element.ts"
import { snow } from "./snow.ts"

customElements.define("test-snow", SnowElement)

afterEach(async () => {
  await emulateReducedMotion(false)
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

interface Arc {
  color: CanvasRenderingContext2D["fillStyle"]
  radius: number
  x: number
  y: number
}

interface DrawnFrame {
  arcs: Arc[]
  texts: string[]
}

interface Drawing {
  advance: (milliseconds: number, count?: number) => void
  lastFrame: () => DrawnFrame
}

/**
 * Replace the canvas context with a recorder and the animation clock with a manual one. A frame
 * starts at each `clearRect`, so `lastFrame()` is the latest thing drawn.
 */
function stubDrawing(): Drawing {
  let latest: DrawnFrame | undefined

  const current = (): DrawnFrame => {
    if (latest === undefined) {
      throw new Error("Nothing was drawn.")
    }

    return latest
  }

  const proto = CanvasRenderingContext2D.prototype
  vi.spyOn(proto, "clearRect").mockImplementation(() => {
    latest = { arcs: [], texts: [] }
  })
  vi.spyOn(proto, "arc").mockImplementation(function arc(
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
  ) {
    current().arcs.push({ color: this.fillStyle, radius, x, y })
  })
  vi.spyOn(proto, "fillText").mockImplementation((text) => {
    current().texts.push(text)
  })

  let now = 0
  let nextFrame: FrameRequestCallback | undefined
  vi.spyOn(performance, "now").mockImplementation(() => now)
  vi.stubGlobal("requestAnimationFrame", (onFrame: FrameRequestCallback) => {
    nextFrame = onFrame

    return 1
  })
  vi.stubGlobal("cancelAnimationFrame", () => {
    nextFrame = undefined
  })

  return {
    advance(milliseconds, count = 1) {
      for (let i = 0; i < count; i += 1) {
        now += milliseconds
        const onFrame = nextFrame
        nextFrame = undefined
        onFrame?.(now)
      }
    },
    lastFrame: current,
  }
}

function mount(attributes: Record<string, string> = {}, style = ""): SnowElement {
  const element = new SnowElement()

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value)
  }

  element.style.cssText = style
  document.body.append(element)

  return element
}

function sizeOf(element: Element) {
  const { height, width } = element.getBoundingClientRect()

  return { height, width }
}

test("renders one decorative canvas in an open shadow root", () => {
  const element = mount()

  const canvases = element.shadowRoot?.querySelectorAll("canvas")
  expect(canvases).toHaveLength(1)
  expect(canvases?.[0]?.getAttribute("aria-hidden")).toBe("true")
  expect(canvases?.[0]?.parentElement?.localName).toBe("div")
  expect(canvases?.[0]?.parentElement?.parentNode).toBe(element.shadowRoot)
  expect(element.shadowRoot?.children).toHaveLength(1)
})

test("receives pointer events like an image does", () => {
  const element = mount()
  const { left, top } = element.getBoundingClientRect()

  expect(document.elementFromPoint(left + 10, top + 10)).toBe(element)
})

test("is an inline-block", () => {
  expect(getComputedStyle(mount()).display).toBe("inline-block")
})

test("is 300 by 150 by default", () => {
  expect(sizeOf(mount())).toEqual({ height: 150, width: 300 })
})

test("takes its default size from width and height", () => {
  expect(sizeOf(mount({ height: "50", width: "200" }))).toEqual({ height: 50, width: 200 })
})

test("keeps dimensions independent when elements share a stylesheet", () => {
  const first = mount({ height: "100", width: "200" })
  const second = mount({ height: "80", width: "90" })
  first.width = 400

  expect(sizeOf(first)).toEqual({ height: 100, width: 400 })
  first.style.cssText = "width: 200px"
  expect(sizeOf(first)).toEqual({ height: 50, width: 200 })
  first.style.cssText = "height: 50px"
  expect(sizeOf(first)).toEqual({ height: 50, width: 200 })
  expect(sizeOf(second)).toEqual({ height: 80, width: 90 })
})

test("follows width and height changes", () => {
  const element = mount()
  element.setAttribute("width", "100")
  element.setAttribute("height", "80")

  expect(sizeOf(element)).toEqual({ height: 80, width: 100 })
})

test("lets CSS override width and height", () => {
  const element = mount({ height: "50", width: "200" }, "width: 120px; height: 90px")

  expect(sizeOf(element)).toEqual({ height: 90, width: 120 })
})

test("keeps the aspect ratio when CSS sizes only the width", () => {
  const element = mount({ height: "50", width: "200" }, "width: 400px")

  expect(sizeOf(element)).toEqual({ height: 100, width: 400 })
})

test("keeps the aspect ratio when CSS sizes only the height", () => {
  const element = mount({ height: "50", width: "200" }, "height: 100px")

  expect(sizeOf(element)).toEqual({ height: 100, width: 400 })
})

test("covers the viewport with the fullscreen overlay recipe", () => {
  const element = mount(
    {},
    "position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none",
  )

  expect(sizeOf(element)).toEqual({ height: innerHeight, width: innerWidth })
})

test("fills the element with the canvas", () => {
  const element = mount({ height: "50", width: "200" })
  const canvas = element.shadowRoot?.querySelector("canvas")

  expect(canvas && sizeOf(canvas)).toEqual({ height: 50, width: 200 })
})

test("sizes the canvas bitmap from the displayed size", async () => {
  const element = mount({ height: "50", width: "200" })
  const canvas = element.shadowRoot?.querySelector("canvas")

  await expect
    .poll(() => canvas && [canvas.width, canvas.height])
    .toEqual([200 * devicePixelRatio, 50 * devicePixelRatio])
})

test.each(["factory", "element"])(
  "updates the %s canvas box before redrawing its bitmap on resize",
  async (mode) => {
    const container = mode === "element" ? new SnowElement() : document.createElement("div")
    container.style.cssText = "position: relative; width: 200px; height: 100px"

    if (container instanceof SnowElement) {
      container.setAttribute("paused", "")
    }

    document.body.append(container)
    const animation = mode === "factory" ? snow(container, { paused: true }) : undefined
    const canvas = (container.shadowRoot ?? container).querySelector("canvas")

    if (canvas === null) {
      throw new Error("The container has no canvas.")
    }

    await expect.poll(() => canvas.width).toBe(200 * devicePixelRatio)

    const resize = async (width: number, height: number): Promise<void> => {
      const previousBitmap = [canvas.width, canvas.height]
      container.style.width = `${width}px`
      container.style.height = `${height}px`
      expect(sizeOf(canvas)).toEqual({ width, height })
      expect([canvas.width, canvas.height]).toEqual(previousBitmap)
      await expect.poll(() => canvas.width).toBe(width * devicePixelRatio)
      expect(sizeOf(canvas)).toEqual({ width, height })
      expect(canvas.height).toBe(height * devicePixelRatio)
    }

    await resize(400, 200)
    await resize(100, 50)

    animation?.dispose()
  },
)

test("keeps physical bitmap dimensions in vertical writing modes", async () => {
  const element = mount({ height: "50", width: "200", paused: "" }, "writing-mode: vertical-rl")
  const elementCanvas = element.shadowRoot?.querySelector("canvas")
  const container = document.createElement("div")
  container.style.cssText =
    "position: relative; width: 200px; height: 50px; writing-mode: vertical-lr"
  document.body.append(container)
  const animation = snow(container, { paused: true })
  const canvas = container.querySelector("canvas")

  if (canvas === null) {
    throw new Error("The container has no canvas.")
  }

  let observed = false

  const observer = new ResizeObserver(() => {
    observed = true
  })

  observer.observe(container)
  await expect.poll(() => observed).toBe(true)
  observer.disconnect()
  expect(elementCanvas && [elementCanvas.width, elementCanvas.height]).toEqual([
    200 * devicePixelRatio,
    50 * devicePixelRatio,
  ])
  expect([canvas.width, canvas.height]).toEqual([200 * devicePixelRatio, 50 * devicePixelRatio])
  animation.dispose()
})

const defaults = {
  density: 30,
  fillMode: "instant",
  flakeColor: "",
  flakeDirection: 0,
  flakeDirectionDeviation: 5,
  flakeSize: 10,
  flakeSizeDeviation: 2,
  flakeSpeed: 150,
  flakeSpeedDeviation: 10,
  height: 150,
  showFps: false,
  width: 300,
} as const

const attributeNames = {
  density: "density",
  fillMode: "fill-mode",
  flakeColor: "flake-color",
  flakeDirection: "flake-direction",
  flakeDirectionDeviation: "flake-direction-deviation",
  flakeSize: "flake-size",
  flakeSizeDeviation: "flake-size-deviation",
  flakeSpeed: "flake-speed",
  flakeSpeedDeviation: "flake-speed-deviation",
  height: "height",
  showFps: "show-fps",
  width: "width",
} as const

const nonDefaultAttributes = {
  density: "12",
  fillMode: "none",
  flakeColor: "#ff0000",
  flakeDirection: "-20",
  flakeDirectionDeviation: "1",
  flakeSize: "7",
  flakeSizeDeviation: "0",
  flakeSpeed: "40",
  flakeSpeedDeviation: "3",
  height: "80",
  showFps: "",
  width: "90",
} as const

const numericOptions = [
  "density",
  "flakeDirection",
  "flakeDirectionDeviation",
  "flakeSize",
  "flakeSizeDeviation",
  "flakeSpeed",
  "flakeSpeedDeviation",
  "height",
  "width",
] as const

const optionNames = [
  "density",
  "fillMode",
  "flakeColor",
  "flakeDirection",
  "flakeDirectionDeviation",
  "flakeSize",
  "flakeSizeDeviation",
  "flakeSpeed",
  "flakeSpeedDeviation",
  "height",
  "showFps",
  "width",
] as const

test("has the documented defaults", () => {
  const element = mount()

  for (const name of optionNames) {
    expect(element[name], name).toBe(defaults[name])
  }
})

test("reads every option from its kebab-case attribute", () => {
  const element = mount({
    density: "12",
    "fill-mode": "none",
    "flake-color": "red",
    "flake-direction": "-20",
    "flake-direction-deviation": "1.5",
    "flake-size": "7",
    "flake-size-deviation": "0",
    "flake-speed": "40",
    "flake-speed-deviation": "3",
    height: "80",
    "show-fps": "",
    width: "90",
  })

  expect(element).toMatchObject({
    density: 12,
    fillMode: "none",
    flakeColor: "red",
    flakeDirection: -20,
    flakeDirectionDeviation: 1.5,
    flakeSize: 7,
    flakeSizeDeviation: 0,
    flakeSpeed: 40,
    flakeSpeedDeviation: 3,
    height: 80,
    showFps: true,
    width: 90,
  })
})

test("writes properties back to attributes", () => {
  const element = mount()
  element.density = 12
  element.fillMode = "none"
  element.flakeColor = "red"
  element.flakeSize = 7
  element.showFps = true

  expect(element.getAttribute("density")).toBe("12")
  expect(element.getAttribute("fill-mode")).toBe("none")
  expect(element.getAttribute("flake-color")).toBe("red")
  expect(element.getAttribute("flake-size")).toBe("7")
  expect(element.getAttribute("show-fps")).toBe("")

  element.showFps = false
  expect(element.hasAttribute("show-fps")).toBe(false)
})

test("reflects dimensions like canvas", () => {
  const element = mount()
  const canvas = document.createElement("canvas")

  for (const value of ["", "  +12px", "0x10", "-0", "-1", "2147483648", "12.9", "\u00A012"]) {
    element.setAttribute("width", value)
    canvas.setAttribute("width", value)
    expect(element.width, value).toBe(canvas.width)
    expect(element.getAttribute("width")).toBe(value)
  }

  for (const value of [12.9, -1, 4_294_967_301, Number.NaN]) {
    element.width = value
    canvas.width = value
    expect(element.width).toBe(canvas.width)
    expect(element.getAttribute("width")).toBe(canvas.getAttribute("width"))
  }

  for (const value of [1n, Symbol("test")]) {
    expect(() => Reflect.set(element, "width", value)).toThrow(TypeError)
    expect(element.getAttribute("width")).toBe(canvas.getAttribute("width"))
  }
})

test("parses floating-point prefixes and converts finite property assignments", () => {
  const element = mount()

  for (const [text, expected] of [
    ["  -1.5e2px", -150],
    ["0x10", 0],
    ["1e+", 1],
    ["+1", 1],
    ["\u00A01", 10],
    ["1e999", 10],
  ] as const) {
    element.setAttribute("flake-size", text)
    expect(element.flakeSize, text).toBe(expected)
    expect(element.getAttribute("flake-size")).toBe(text)
  }

  for (const value of ["2.5", null, -0]) {
    Reflect.set(element, "flakeSize", value)
    expect(element.flakeSize).toBe(Number(value) || 0)
  }

  for (const value of [undefined, Number.NaN, Infinity, -Infinity, 1n, Symbol("test")]) {
    expect(() => Reflect.set(element, "flakeSize", value)).toThrow(TypeError)
    expect(element.getAttribute("flake-size")).toBe("0")
  }
})

test("converts double assignments like a native meter", () => {
  const element = mount()
  const meter = document.createElement("meter")

  for (const value of [12.5, "2.5", null, -0, undefined, Infinity, 1n, Symbol("test")]) {
    let snowError: unknown
    let meterError: unknown

    try {
      Reflect.set(element, "flakeSize", value)
    } catch (error) {
      snowError = error
    }

    try {
      Reflect.set(meter, "value", value)
    } catch (error) {
      meterError = error
    }

    expect(snowError instanceof TypeError).toBe(meterError instanceof TypeError)
    expect(element.getAttribute("flake-size")).toBe(meter.getAttribute("value"))
  }
})

test("reads floating-point prefixes like a native meter", () => {
  const element = mount()
  const meter = document.createElement("meter")
  meter.min = -1000
  meter.max = 1000

  for (const value of ["  -1.5e2px", "0x10", "1e+", "+1", "-0", ".25em"]) {
    element.setAttribute("flake-direction", value)
    meter.setAttribute("low", value)
    expect(element.flakeDirection, value).toBe(meter.low)
    expect(element.getAttribute("flake-direction")).toBe(meter.getAttribute("low"))
  }
})

test("restores the default when an attribute is removed", () => {
  const element = mount()

  for (const name of optionNames) {
    element.setAttribute(attributeNames[name], nonDefaultAttributes[name])
    expect(element[name], name).not.toBe(defaults[name])
    element.removeAttribute(attributeNames[name])
    expect(element[name], name).toBe(defaults[name])
  }
})

test.each(["", "  ", "abc", "Infinity", "-Infinity", "NaN"])(
  "falls back to the default for the numeric value %j",
  (value) => {
    const element = mount()

    for (const name of numericOptions) {
      element.setAttribute(attributeNames[name], value)
      expect(element[name], name).toBe(defaults[name])
    }
  },
)

test("keeps an explicit zero", () => {
  const element = mount()

  for (const name of numericOptions) {
    element.setAttribute(attributeNames[name], "0")
    expect(element[name], name).toBe(0)
  }
})

test("clamps negative density and defaults negative dimensions without changing attributes", () => {
  const element = mount({ density: "-1", height: "-1", width: "-1" })

  expect(element).toMatchObject({ density: 0, height: 150, width: 300 })
  expect(element.getAttribute("density")).toBe("-1")
  element.density = -2
  expect(element.density).toBe(0)
  expect(element.getAttribute("density")).toBe("-2")
  element.removeAttribute("density")
  expect(element.density).toBe(30)
})

test("accepts negative directions", () => {
  expect(mount({ "flake-direction": "-45" }).flakeDirection).toBe(-45)
})

test("falls back to instant for an unknown fill mode", () => {
  expect(mount({ "fill-mode": "fade" }).fillMode).toBe("instant")
})

test("reflects strings and canonicalizes fill mode without changing markup", () => {
  const element = mount()

  for (const [value, expected] of [
    ["NoNe", "none"],
    ["INSTANT", "instant"],
    [" none ", "instant"],
    ["", "instant"],
  ] as const) {
    element.setAttribute("fill-mode", value)
    expect(element.fillMode).toBe(expected)
    expect(element.getAttribute("fill-mode")).toBe(value)
  }

  for (const value of [null, undefined, 42]) {
    Reflect.set(element, "flakeColor", value)
    expect(element.flakeColor).toBe(String(value))
    Reflect.set(element, "fillMode", value)
    expect(element.getAttribute("fill-mode")).toBe(String(value))
  }

  for (const name of ["flakeColor", "fillMode"]) {
    const before = element.getAttribute(name === "flakeColor" ? "flake-color" : "fill-mode")
    expect(() => Reflect.set(element, name, Symbol("test"))).toThrow(TypeError)
    expect(element.getAttribute(name === "flakeColor" ? "flake-color" : "fill-mode")).toBe(before)
  }

  element.removeAttribute("flake-color")
  expect(element.flakeColor).toBe("")
})

test("converts color assignments like a native DOMString property", () => {
  const element = mount()
  const div = document.createElement("div")

  for (const value of [null, undefined, 42, { toString: () => "snow" }, Symbol("test")]) {
    let snowError: unknown
    let divError: unknown

    try {
      Reflect.set(element, "flakeColor", value)
    } catch (error) {
      snowError = error
    }

    try {
      Reflect.set(div, "title", value)
    } catch (error) {
      divError = error
    }

    expect(snowError instanceof TypeError).toBe(divError instanceof TypeError)
    expect(element.flakeColor).toBe(div.title)
    expect(element.getAttribute("flake-color")).toBe(div.getAttribute("title"))
  }
})

test("canonicalizes fill mode like a native enumerated property", () => {
  const element = mount()
  const video = document.createElement("video")

  // Snow's instant state corresponds to video's auto state; both use it as the invalid default.
  for (const [snowValue, videoValue] of [
    ["NoNe", "NoNe"],
    ["INSTANT", "AUTO"],
    [" none ", " none "],
    ["", ""],
    ["unknown", "unknown"],
  ]) {
    element.setAttribute("fill-mode", snowValue)
    video.setAttribute("preload", videoValue)
    expect(element.fillMode).toBe(video.preload === "none" ? "none" : "instant")
    expect(element.getAttribute("fill-mode")).toBe(snowValue)
    expect(video.getAttribute("preload")).toBe(videoValue)
  }

  for (const value of ["NoNe", "unknown", null, undefined]) {
    Reflect.set(element, "fillMode", value)
    Reflect.set(video, "preload", value)
    expect(element.fillMode).toBe(video.preload === "none" ? "none" : "instant")
    expect(element.getAttribute("fill-mode")).toBe(video.getAttribute("preload"))
  }
})

test("reflects boolean attributes by presence and property truthiness", () => {
  const element = mount({ paused: "false", "show-fps": "false", "ignore-reduced-motion": "false" })

  for (const [name, attribute] of [
    ["paused", "paused"],
    ["showFps", "show-fps"],
    ["ignoreReducedMotion", "ignore-reduced-motion"],
  ] as const) {
    expect(element[name]).toBe(true)
    Reflect.set(element, name, 0)
    expect(element.hasAttribute(attribute)).toBe(false)
    Reflect.set(element, name, "false")
    expect(element.getAttribute(attribute)).toBe("")
  }
})

const bigSnow = { height: "1000", width: "1000" }
const turnover = { count: 60, milliseconds: 100 }

test("draws the flakes of its attributes on connection", () => {
  const drawing = stubDrawing()
  mount({
    ...bigSnow,
    density: "10",
    "flake-color": "#ff0000",
    "flake-size": "20",
    "flake-size-deviation": "0",
  })

  const { arcs } = drawing.lastFrame()
  expect(arcs).toHaveLength(10)

  for (const arc of arcs) {
    expect(arc).toMatchObject({ color: "#ff0000", radius: 10 })
  }
})

test("starts empty when the fill mode is none", () => {
  const drawing = stubDrawing()
  mount({ ...bigSnow, "fill-mode": "none" })

  expect(drawing.lastFrame().arcs).toHaveLength(0)
})

test("moves flakes at the speed of its attributes", () => {
  const drawing = stubDrawing()
  // A centered flake can't leave the canvas during the test.
  vi.spyOn(Math, "random").mockReturnValue(0.5)
  mount({
    ...bigSnow,
    density: "1",
    "flake-direction-deviation": "0",
    "flake-size-deviation": "0",
    "flake-speed": "200",
    "flake-speed-deviation": "0",
  })
  const [before] = drawing.lastFrame().arcs
  drawing.advance(100)
  const [after] = drawing.lastFrame().arcs

  expect(after?.y).toBeCloseTo((before?.y ?? 0) + 20)
  expect(after?.x).toBeCloseTo(before?.x ?? 0)
})

test("shows the frame rate when the attribute is toggled", () => {
  const drawing = stubDrawing()
  const element = mount(bigSnow)
  drawing.advance(100)
  expect(drawing.lastFrame().texts).toEqual([])

  element.setAttribute("show-fps", "")
  drawing.advance(100)
  expect(drawing.lastFrame().texts).toHaveLength(1)

  element.showFps = false
  drawing.advance(100)
  expect(drawing.lastFrame().texts).toEqual([])
})

test("gives new flakes the color set by a property", () => {
  const drawing = stubDrawing()
  const element = mount({ ...bigSnow, "flake-speed": "500" })
  element.flakeColor = "#0000ff"
  drawing.advance(turnover.milliseconds, turnover.count)

  const { arcs } = drawing.lastFrame()
  expect(arcs.length).toBeGreaterThan(0)
  expect(new Set(arcs.map((arc) => arc.color))).toEqual(new Set(["#0000ff"]))
})

test("gives new flakes the size set by an attribute", () => {
  const drawing = stubDrawing()
  const element = mount({ ...bigSnow, "flake-size-deviation": "0", "flake-speed": "500" })
  element.setAttribute("flake-size", "30")
  drawing.advance(turnover.milliseconds, turnover.count)

  const { arcs } = drawing.lastFrame()
  expect(arcs.length).toBeGreaterThan(0)
  expect(new Set(arcs.map((arc) => arc.radius))).toEqual(new Set([15]))
})

test("stops sending flakes when density becomes zero", () => {
  const drawing = stubDrawing()
  const element = mount({ ...bigSnow, "flake-speed": "500" })
  element.density = 0
  drawing.advance(turnover.milliseconds, turnover.count)

  expect(drawing.lastFrame().arcs).toHaveLength(0)
})

test("fills new space instantly only when the fill mode is instant", async () => {
  const drawing = stubDrawing()
  const element = mount({ height: "100", width: "100", density: "1000" })
  const canvas = element.shadowRoot?.querySelector("canvas")
  const initial = drawing.lastFrame().arcs.length
  element.fillMode = "none"
  element.width = 200
  await expect.poll(() => canvas?.width).toBe(200 * devicePixelRatio)
  expect(drawing.lastFrame().arcs.length).toBeLessThanOrEqual(initial)

  element.fillMode = "instant"
  element.width = 400
  await expect.poll(() => canvas?.width).toBe(400 * devicePixelRatio)
  expect(drawing.lastFrame().arcs.length).toBeGreaterThan(initial * 2)
})

test("restores the rendering color when the attribute is removed", () => {
  const drawing = stubDrawing()
  const element = mount({ ...bigSnow, "flake-color": "red", "flake-speed": "500" })
  element.removeAttribute("flake-color")
  drawing.advance(turnover.milliseconds, turnover.count)
  expect(element.flakeColor).toBe("")
  expect(drawing.lastFrame().arcs.length).toBeGreaterThan(0)
  expect(new Set(drawing.lastFrame().arcs.map((arc) => arc.color))).toEqual(
    new Set(["rgba(255, 255, 255, 0.9)"]),
  )
})

async function emulateReducedMotion(reduce: boolean): Promise<void> {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }],
  })
}

async function settle(milliseconds = 100): Promise<void> {
  const end = Date.now() + milliseconds

  await vi.waitFor(
    () => {
      if (Date.now() < end) {
        throw new Error("Still settling.")
      }
    },
    { interval: 10 },
  )
}

/** Whether the animation draws a new frame when the clock moves on. */
function isAnimating(drawing: Drawing): boolean {
  const before = drawing.lastFrame()
  drawing.advance(100)

  return drawing.lastFrame() !== before
}

test("paused is a presence-based boolean attribute and property", () => {
  const element = mount()
  expect(element.paused).toBe(false)

  element.setAttribute("paused", "")
  expect(element.paused).toBe(true)

  element.removeAttribute("paused")
  expect(element.paused).toBe(false)

  element.paused = true
  expect(element.getAttribute("paused")).toBe("")

  element.paused = false
  expect(element.hasAttribute("paused")).toBe(false)
})

test("ignoreReducedMotion is a presence-based boolean attribute and property", () => {
  const element = mount()
  expect(element.ignoreReducedMotion).toBe(false)

  element.setAttribute("ignore-reduced-motion", "")
  expect(element.ignoreReducedMotion).toBe(true)

  element.ignoreReducedMotion = false
  expect(element.hasAttribute("ignore-reduced-motion")).toBe(false)

  element.ignoreReducedMotion = true
  expect(element.getAttribute("ignore-reduced-motion")).toBe("")
})

test("draws one frame but does not animate when it starts paused", () => {
  const drawing = stubDrawing()
  mount({ ...bigSnow, paused: "" })

  expect(drawing.lastFrame().arcs.length).toBeGreaterThan(0)
  expect(isAnimating(drawing)).toBe(false)
})

test("animates until paused and again after resuming", () => {
  const drawing = stubDrawing()
  const element = mount(bigSnow)
  expect(isAnimating(drawing)).toBe(true)

  element.paused = true
  expect(isAnimating(drawing)).toBe(false)

  element.removeAttribute("paused")
  expect(isAnimating(drawing)).toBe(true)
})

test("does not move flakes for the time spent paused", () => {
  const drawing = stubDrawing()
  // A centered flake can't leave the canvas during the test.
  vi.spyOn(Math, "random").mockReturnValue(0.5)

  const element = mount({
    ...bigSnow,
    density: "1",
    "flake-direction-deviation": "0",
    "flake-speed": "200",
    "flake-speed-deviation": "0",
  })

  element.paused = true
  const [before] = drawing.lastFrame().arcs
  drawing.advance(5000)
  element.paused = false
  drawing.advance(100)
  const [after] = drawing.lastFrame().arcs

  expect(after?.y).toBeCloseTo((before?.y ?? 0) + 20)
})

test("stops while the system asks for reduced motion and resumes when it does not", async () => {
  const drawing = stubDrawing()
  const element = mount(bigSnow)
  await emulateReducedMotion(true)
  await expect.poll(() => isAnimating(drawing)).toBe(false)
  expect(element.paused).toBe(false)
  expect(element.hasAttribute("paused")).toBe(false)

  await emulateReducedMotion(false)
  await expect.poll(() => isAnimating(drawing)).toBe(true)
})

test("does not start when the page loads with reduced motion", async () => {
  await emulateReducedMotion(true)
  const drawing = stubDrawing()
  mount(bigSnow)

  expect(drawing.lastFrame().arcs.length).toBeGreaterThan(0)
  expect(isAnimating(drawing)).toBe(false)
})

test("keeps an author pause when reduced motion is turned off", async () => {
  const drawing = stubDrawing()
  mount({ ...bigSnow, paused: "" })
  await emulateReducedMotion(true)
  await emulateReducedMotion(false)

  expect(isAnimating(drawing)).toBe(false)
})

test("keeps animating under reduced motion with ignore-reduced-motion", async () => {
  const drawing = stubDrawing()
  const element = mount({ ...bigSnow, "ignore-reduced-motion": "" })
  await emulateReducedMotion(true)
  expect(isAnimating(drawing)).toBe(true)

  element.ignoreReducedMotion = false
  expect(isAnimating(drawing)).toBe(false)

  element.ignoreReducedMotion = true
  expect(isAnimating(drawing)).toBe(true)
})

test("lets paused win over ignore-reduced-motion", async () => {
  const drawing = stubDrawing()
  const element = mount({ ...bigSnow, "ignore-reduced-motion": "" })
  await emulateReducedMotion(true)
  element.paused = true

  expect(isAnimating(drawing)).toBe(false)
})

test("stops animating when removed from the page", () => {
  const drawing = stubDrawing()
  const element = mount(bigSnow)
  element.remove()

  expect(isAnimating(drawing)).toBe(false)
})

test("resumes from the same flakes when put back, without simulating the time away", async () => {
  const drawing = stubDrawing()
  // Centered flakes can't leave within the test, so the flake count only changes through arrivals.
  vi.spyOn(Math, "random").mockReturnValue(0.5)

  const element = mount({
    ...bigSnow,
    density: "5",
    "flake-direction-deviation": "0",
    "flake-speed": "200",
    "flake-speed-deviation": "0",
  })

  // Stop random edge arrivals; the initial fill stays on screen.
  element.density = 0

  const before = drawing.lastFrame().arcs

  element.remove()
  drawing.advance(5000)
  await settle()

  document.body.append(element)
  await settle()

  drawing.advance(100)
  const after = drawing.lastFrame().arcs

  expect(after).toHaveLength(before.length)

  for (const [i, arc] of before.entries()) {
    expect(after[i]?.y).toBeCloseTo(arc.y + 20)
    expect(after[i]?.x).toBeCloseTo(arc.x)
  }
})

test.each(["content-box", "border-box"])(
  "sizes and positions the canvas inside a padded %s container",
  async (boxSizing) => {
    const container = document.createElement("div")
    container.style.cssText = `position: relative; width: 200px; height: 100px; padding: 7px 11px; border: 3px solid; box-sizing: ${boxSizing}`
    const child = document.createElement("span")
    container.append(child)
    document.body.append(container)
    const animation = snow(container, { paused: true })
    const canvas = container.querySelector("canvas")

    if (canvas === null) {
      throw new Error("The container has no canvas.")
    }

    const width = boxSizing === "border-box" ? 194 : 222
    const height = boxSizing === "border-box" ? 94 : 114

    const checkGeometry = (): void => {
      expect(sizeOf(canvas)).toEqual({ height, width })
      const outer = container.getBoundingClientRect()
      const inner = canvas.getBoundingClientRect()
      expect([inner.left - outer.left, inner.top - outer.top]).toEqual([3, 3])
      expect([canvas.width, canvas.height]).toEqual([
        width * devicePixelRatio,
        height * devicePixelRatio,
      ])
    }

    checkGeometry()
    await expect.poll(() => canvas.width).toBe(width * devicePixelRatio)
    await expect.poll(() => getComputedStyle(canvas).left).toBe("0px")
    checkGeometry()
    animation.dispose()
    expect(container.children).toHaveLength(1)
    expect(container.firstElementChild).toBe(child)
    expect(container.style.position).toBe("relative")
  },
)

test.each(["first connection", "reconnection"])(
  "adopts shared styles in the destination document on %s",
  async (connection) => {
    const frame = document.createElement("iframe")
    document.body.append(frame)
    const target = frame.contentDocument

    if (target === null) {
      throw new Error("The frame has no document.")
    }

    const element = new SnowElement()
    element.width = 200
    element.height = 100
    element.paused = true

    if (connection === "reconnection") {
      document.body.append(element)
    }

    target.body.append(element)
    expect(sizeOf(element)).toEqual({ width: 200, height: 100 })
    const canvas = element.shadowRoot?.querySelector("canvas")
    await expect.poll(() => canvas?.width).toBe(200 * devicePixelRatio)
  },
)

test("stays paused when put back while the author has it paused", () => {
  const drawing = stubDrawing()
  const element = mount({ ...bigSnow, paused: "" })
  element.remove()
  document.body.append(element)

  expect(isAnimating(drawing)).toBe(false)
})

test("does not listen to reduced motion changes while removed", async () => {
  const drawing = stubDrawing()
  const element = mount(bigSnow)
  element.remove()
  await emulateReducedMotion(true)
  await emulateReducedMotion(false)

  expect(isAnimating(drawing)).toBe(false)
})

test("fills changing padding without modifying the consumer's styles or layout", async () => {
  const container = document.createElement("div")
  container.style.cssText =
    "position: relative; width: 200px; height: 100px; padding: 10px; border: 3px solid"
  document.body.append(container)
  const before = sizeOf(container)
  const animation = snow(container, { paused: true })
  const canvas = container.querySelector("canvas")

  if (canvas === null) {
    throw new Error("The container has no canvas.")
  }

  await expect.poll(() => sizeOf(canvas)).toEqual({ height: 120, width: 220 })
  expect(sizeOf(container)).toEqual(before)
  expect(canvas.parentElement).toBe(container)
  expect(container.children).toHaveLength(1)
  const inlineStyle = container.getAttribute("style")
  container.style.padding = "30px 50px"
  const changedStyle = container.getAttribute("style")

  await expect.poll(() => sizeOf(canvas)).toEqual({ height: 160, width: 300 })
  await expect.poll(() => canvas.width).toBe(300 * devicePixelRatio)
  const outer = container.getBoundingClientRect()
  const inner = canvas.getBoundingClientRect()
  expect([inner.left - outer.left, inner.top - outer.top]).toEqual([3, 3])
  expect(container.getAttribute("style")).toBe(changedStyle)
  expect(inlineStyle).not.toBe(changedStyle)
  animation.dispose()
  expect(container.getAttribute("style")).toBe(changedStyle)
  expect(container.children).toHaveLength(0)
})

test.each(["factory", "element"])(
  "keeps the %s bitmap pixels fixed before resize delivery",
  async (mode) => {
    const NativeResizeObserver = ResizeObserver
    let hold = false
    vi.stubGlobal(
      "ResizeObserver",
      class extends NativeResizeObserver {
        constructor(onResize: ResizeObserverCallback) {
          super((entries, observer) => {
            if (!hold) {
              onResize(entries, observer)
            }
          })
        }
      },
    )
    const container = mode === "element" ? new SnowElement() : document.createElement("div")
    container.style.cssText = "position: relative; width: 200px; height: 100px; background: black"

    if (container instanceof SnowElement) {
      container.paused = true
      container.density = 0
    }

    document.body.append(container)
    const animation = mode === "factory" ? snow(container, { density: 0, paused: true }) : undefined
    const canvas = (container.shadowRoot ?? container).querySelector("canvas")
    const context = canvas?.getContext("2d")

    if (canvas === null || context === null || context === undefined) {
      throw new Error("The animation has no drawing context.")
    }

    await expect.poll(() => canvas.width).toBe(200 * devicePixelRatio)
    await settle()
    hold = true
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    context.fillStyle = "red"
    context.fillRect(25, 20, 5, 30)

    const stripe = async (): Promise<number[]> => {
      const { left, top } = container.getBoundingClientRect()
      const frame = window.frameElement?.getBoundingClientRect()

      const { data } = await cdp().send("Page.captureScreenshot", {
        clip: {
          height: 1,
          scale: 1,
          width: 80,
          x: left + (frame?.left ?? 0),
          y: top + (frame?.top ?? 0) + 25,
        },
        format: "png",
      })

      const image = new Image()
      image.src = `data:image/png;base64,${data}`
      await image.decode()
      const sample = document.createElement("canvas")
      sample.width = image.width
      sample.height = image.height
      const sampleContext = sample.getContext("2d")

      if (sampleContext === null) {
        throw new Error("Could not read the screenshot.")
      }

      sampleContext.drawImage(image, 0, 0)
      const rgba = sampleContext.getImageData(0, 0, image.width, 1).data
      const columns: number[] = []

      for (let x = 0; x < image.width; x += 1) {
        if (rgba[x * 4] > 200 && rgba[x * 4 + 1] < 50 && rgba[x * 4 + 2] < 50) {
          columns.push(x)
        }
      }

      return columns
    }

    const before = await stripe()
    expect(before.length).toBeGreaterThan(0)
    container.style.width = "350px"
    container.style.height = "200px"
    expect(await stripe()).toEqual(before)
    container.style.width = "100px"
    container.style.height = "70px"
    expect(await stripe()).toEqual(before)
    animation?.dispose()
  },
)

test("fills the custom element's padding without changing its inline styles", async () => {
  const element = mount(
    { paused: "" },
    "width: 200px; height: 100px; padding: 10px; border: 3px solid",
  )

  const inlineStyle = element.getAttribute("style")
  const canvas = element.shadowRoot?.querySelector("canvas")

  await expect.poll(() => canvas && sizeOf(canvas)).toEqual({ height: 120, width: 220 })
  expect(element.getAttribute("style")).toBe(inlineStyle)
  element.style.padding = "30px 50px"
  await expect.poll(() => canvas && sizeOf(canvas)).toEqual({ height: 160, width: 300 })
})

test("keeps content-driven wrapper layout and styles unchanged", async () => {
  const parent = document.createElement("div")
  parent.style.width = "400px"
  const container = document.createElement("div")
  container.style.position = "relative"
  const content = document.createElement("div")
  content.style.height = "80px"
  container.append(content)
  parent.append(container)
  document.body.append(parent)
  const before = sizeOf(container)
  const inlineStyle = container.getAttribute("style")
  const animation = snow(container, { paused: true })
  const canvas = container.querySelector("canvas")

  await expect.poll(() => canvas && sizeOf(canvas)).toEqual({ height: 80, width: 400 })
  expect(sizeOf(container)).toEqual(before)
  expect(container.getAttribute("style")).toBe(inlineStyle)
  animation.dispose()
  expect(container.children).toHaveLength(1)
  expect(container.firstElementChild).toBe(content)
})

test("removes its canvas when initial sizing fails", () => {
  const container = document.createElement("div")
  container.style.cssText = "width: 200px; height: 100px"
  document.body.append(container)
  const inlineStyle = container.getAttribute("style")

  expect(() => snow(container, { density: Number.MAX_VALUE })).toThrow(RangeError)
  expect(container.children).toHaveLength(0)
  expect(container.getAttribute("style")).toBe(inlineStyle)
})

test.each([0.8, 1.25, 2])("does not enlarge scrollable overflow at density %s", async (ratio) => {
  vi.stubGlobal("devicePixelRatio", ratio)
  const container = document.createElement("div")
  container.style.cssText =
    "position: relative; width: 200px; height: 100px; padding: 10px; overflow: auto"
  document.body.append(container)
  const animation = snow(container, { paused: true })
  const canvas = container.querySelector("canvas")

  await expect.poll(() => canvas?.width).toBe(Math.round(220 * ratio))
  expect([container.scrollWidth, container.scrollHeight]).toEqual([
    container.clientWidth,
    container.clientHeight,
  ])
  animation.dispose()
})

test("keeps automatic positioning until the last animation is disposed", () => {
  const container = document.createElement("div")
  container.style.cssText = "width: 200px; height: 100px; padding: 10px"
  document.body.append(container)
  const first = snow(container, { density: 0, paused: true })
  const second = snow(container, { density: 0, paused: true })
  const canvas = container.querySelector("canvas")

  expect(container.style.position).toBe("relative")
  expect(canvas && sizeOf(canvas)).toEqual({ height: 120, width: 220 })
  first.dispose()
  expect(container.style.position).toBe("relative")
  expect(container.querySelectorAll("canvas")).toHaveLength(1)
  second.dispose()
  expect(container.style.position).toBe("")
  expect(container.querySelectorAll("canvas")).toHaveLength(0)
})

test("positions a static container and restores its original inline priority", () => {
  const host = document.createElement("div")
  host.style.cssText = "position: static !important; width: 200px; height: 100px; padding: 10px"
  document.body.append(host)
  const animation = snow(host, { density: 0, paused: true })
  const canvas = host.querySelector("canvas")

  expect(canvas?.parentNode).toBe(host)
  expect(host.children).toHaveLength(1)
  expect(getComputedStyle(host).position).toBe("relative")
  expect(canvas && sizeOf(canvas)).toEqual({ height: 120, width: 220 })
  animation.dispose()
  expect(host.children).toHaveLength(0)
  expect(host.style.position).toBe("static")
  expect(host.style.getPropertyPriority("position")).toBe("important")
})

test("preserves consumer style changes when automatic positioning is released", () => {
  const container = document.createElement("div")
  container.style.cssText = "width: 200px; height: 100px"
  document.body.append(container)
  const animation = snow(container, { paused: true })
  container.style.position = "fixed"
  container.style.padding = "10px"
  animation.dispose()

  expect(container.style.position).toBe("fixed")
  expect(container.style.padding).toBe("10px")
})

test("positions a container despite an important static stylesheet rule", () => {
  const sheet = document.createElement("style")
  sheet.textContent = ".snow-static { position: static !important; }"
  const container = document.createElement("div")
  container.className = "snow-static"
  container.style.cssText = "width: 200px; height: 100px"
  document.body.append(sheet, container)
  const animation = snow(container, { paused: true })

  expect(getComputedStyle(container).position).toBe("relative")
  animation.dispose()
  expect(container.style.position).toBe("")
  expect(container.style.getPropertyPriority("position")).toBe("")
  expect(getComputedStyle(container).position).toBe("static")
})

test("positions a container first attached after animation creation", async () => {
  const container = document.createElement("div")
  container.style.cssText = "width: 200px; height: 100px; padding: 10px"
  const animation = snow(container, { paused: true })
  document.body.append(container)
  const canvas = container.querySelector("canvas")

  await expect.poll(() => getComputedStyle(container).position).toBe("relative")
  await expect.poll(() => canvas?.width).toBe(220 * devicePixelRatio)
  expect(canvas && sizeOf(canvas)).toEqual({ height: 120, width: 220 })
  animation.dispose()
  expect(container.style.position).toBe("")
})

test("preserves stylesheet positioning when a detached container is attached", async () => {
  const sheet = document.createElement("style")
  sheet.textContent = ".snow-positioned { position: absolute; left: 20px; top: 10px; }"
  document.body.append(sheet)
  const container = document.createElement("div")
  container.className = "snow-positioned"
  container.style.cssText = "width: 200px; height: 100px"
  const animation = snow(container, { paused: true })
  document.body.append(container)
  const canvas = container.querySelector("canvas")

  await expect.poll(() => canvas?.width).toBe(200 * devicePixelRatio)
  expect(getComputedStyle(container).position).toBe("absolute")
  expect(container.style.position).toBe("")
  expect(canvas && sizeOf(canvas)).toEqual({ height: 100, width: 200 })
  animation.dispose()
  expect(container.style.position).toBe("")
})

test("disposal cancels deferred positioning and makes its queued callback harmless", async () => {
  let onFrame: FrameRequestCallback | undefined
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((nextFrame) => {
    onFrame = nextFrame

    return 777
  })
  const cancel = vi.spyOn(window, "cancelAnimationFrame")
  const container = document.createElement("div")
  container.style.cssText = "width: 200px; height: 100px"
  const animation = snow(container, { paused: true })
  document.body.append(container)
  await expect.poll(() => onFrame).toBeDefined()
  animation.dispose()
  expect(cancel).toHaveBeenCalledWith(777)
  onFrame?.(0)
  expect(container.style.position).toBe("")
  expect(container.children).toHaveLength(0)
})

test("retries deferred positioning after removal and reinsertion before layout", async () => {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((nextFrame) => {
    frames.push(nextFrame)

    return 777
  })
  const container = document.createElement("div")
  container.style.cssText = "width: 200px; height: 100px"
  const animation = snow(container, { paused: true })
  document.body.append(container)
  await expect.poll(() => frames.length).toBe(1)
  container.remove()
  frames.shift()?.(0)
  document.body.append(container)
  await expect.poll(() => frames.length).toBe(1)
  frames.shift()?.(0)

  expect(container.style.position).toBe("relative")
  expect(container.querySelector("canvas")?.width).toBe(200 * devicePixelRatio)
  animation.dispose()
})

test.each([
  { name: "sized", style: "width: 200px; height: 100px; padding: 10px", width: 220, height: 120 },
  { name: "padding-only", style: "width: 0; height: 0; padding: 10px", width: 20, height: 20 },
])(
  "initializes a detached $name container under a zero-sized ancestor",
  async ({ style, width, height }) => {
    const ancestor = document.createElement("div")
    ancestor.style.cssText = "position: relative; width: 0; height: 0"
    const container = document.createElement("div")
    container.style.cssText = style
    const animation = snow(container, { paused: true })
    await settle()
    ancestor.append(container)
    document.body.append(ancestor)

    await expect.poll(() => container.style.position).toBe("relative")
    expect(container.querySelector("canvas")?.width).toBe(width * devicePixelRatio)
    const canvas = container.querySelector("canvas")
    expect(canvas && sizeOf(canvas)).toEqual({ width, height })
    animation.dispose()
  },
)
