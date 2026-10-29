import { afterEach, expect, test, vi } from "vite-plus/test"
import Snow from "./snow"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const setupAnimation = () => {
  let nextFrame = vi.fn()

  /** @param {FrameRequestCallback} onFrame The scheduled frame. */
  const scheduleFrame = (onFrame) => {
    nextFrame = () => {
      onFrame(0)
    }

    return 1
  }

  const requestFrame = vi.fn(scheduleFrame)
  vi.stubGlobal("requestAnimationFrame", requestFrame)
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  const now = vi.spyOn(Date, "now").mockReturnValue(0)
  vi.spyOn(Math, "random").mockReturnValue(0.5)

  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
  }

  const canvas = { getContext: vi.fn().mockReturnValue(context), height: 100, width: 100 }
  const snow = Snow(canvas)
  Object.assign(snow, { flow: 1, meanSize: 10, meanSpeed: 100, sdAngle: 0, sdSize: 0, sdSpeed: 0 })

  /** @param {number} time The frame time in milliseconds. */
  const frame = (time) => {
    now.mockReturnValue(time)
    nextFrame()
  }

  return { canvas, context, frame, now, snow }
}

test("starts, stops, and resumes the animation", () => {
  const requestFrame = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2)
  const cancelFrame = vi.fn()
  vi.stubGlobal("requestAnimationFrame", requestFrame)
  vi.stubGlobal("cancelAnimationFrame", cancelFrame)

  const snow = Snow({})
  expect(requestFrame).toHaveBeenCalledTimes(1)

  snow.stop()
  expect(cancelFrame).toHaveBeenCalledWith(1)

  snow.resume()
  expect(requestFrame).toHaveBeenCalledTimes(2)
})

test("resuming ignores time spent stopped", () => {
  const { snow, context, frame, now } = setupAnimation()
  snow.stop()
  now.mockReturnValue(3_600_000)
  snow.resume()
  frame(3_600_020)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(-4)
})

test("limits catch-up work after a long frame", () => {
  const { context, frame } = setupAnimation()
  frame(3_600_000)
  expect(context.arc).toHaveBeenCalledTimes(5)
})

test("keeps a flake's direction and speed between frames", () => {
  const { snow, context, frame } = setupAnimation()
  snow.meanAngle = 30
  frame(20)

  snow.flow = 0
  context.arc.mockClear()
  frame(40)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0][0]).toBeCloseTo(48.5)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(-5 + 1.5 * Math.sqrt(3))
})

test("removes departed flakes without skipping survivors", () => {
  const { snow, context, canvas, frame } = setupAnimation()
  frame(20)
  snow.meanSpeed = 1
  frame(40)
  snow.flow = 0
  canvas.height = 0
  frame(140)
  context.arc.mockClear()
  frame(240)
  expect(context.arc).toHaveBeenCalledTimes(1)
  expect(context.arc.mock.calls[0][1]).toBeCloseTo(-4.79)
})

test("sets the batch color once and keeps the newest flake's color", () => {
  const { snow, context, frame } = setupAnimation()
  const setColor = vi.fn(() => {})
  Object.defineProperty(context, "fillStyle", { get: vi.fn().mockReturnValue(""), set: setColor })
  frame(100)
  expect(context.arc).toHaveBeenCalledTimes(5)
  expect(setColor).toHaveBeenCalledExactlyOnceWith(snow.color)

  setColor.mockClear()
  snow.color = "blue"
  frame(200)
  expect(setColor).toHaveBeenCalledExactlyOnceWith("blue")
})

test("constructor options override defaults, including zero and false", () => {
  const { canvas } = setupAnimation()

  const options = {
    color: "blue",
    flow: 0,
    isFpsShown: false,
    meanAngle: 30,
    meanSize: 4,
    meanSpeed: 80,
    sdAngle: 0,
    sdSize: 0,
    sdSpeed: 0,
  }

  const snow = Snow(canvas, options)
  expect(snow).toMatchObject(options)
  expect(Snow(canvas, { flow: 0 }).meanSize).toBe(10)
})
