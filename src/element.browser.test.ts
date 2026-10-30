/// <reference types="@vitest/browser-playwright" />
import { afterEach, expect, test, vi } from "vite-plus/test"
import { cdp } from "vite-plus/test/browser"
import { SnowElement } from "./element"

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

const defaults = {
  density: 30,
  fillMode: "instant",
  flakeColor: "rgba(255,255,255,0.9)",
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

test("restores the default when an attribute is removed", () => {
  const element = mount()

  for (const name of optionNames) {
    element.setAttribute(attributeNames[name], nonDefaultAttributes[name])
    expect(element[name], name).not.toBe(defaults[name])
    element.removeAttribute(attributeNames[name])
    expect(element[name], name).toBe(defaults[name])
  }
})

test.each(["", "  ", "abc", "1x", "Infinity", "-Infinity", "NaN", "1e999"])(
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

test("falls back to the default for negative density, width and height", () => {
  const element = mount({ density: "-1", height: "-1", width: "-1" })

  expect(element).toMatchObject({ density: 30, height: 150, width: 300 })
})

test("accepts negative directions", () => {
  expect(mount({ "flake-direction": "-45" }).flakeDirection).toBe(-45)
})

test("falls back to instant for an unknown fill mode", () => {
  expect(mount({ "fill-mode": "fade" }).fillMode).toBe("instant")
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

test("reads an invalid property value back as the default", () => {
  const element = mount()
  element.flakeSize = Number.NaN
  element.density = -5
  Reflect.set(element, "fillMode", "fade")

  expect(element).toMatchObject({ density: 30, fillMode: "instant", flakeSize: 10 })
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

  const element = mount({
    ...bigSnow,
    density: "5",
    "flake-direction-deviation": "0",
    "flake-speed": "200",
    "flake-speed-deviation": "0",
  })

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
