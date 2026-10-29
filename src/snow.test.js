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
