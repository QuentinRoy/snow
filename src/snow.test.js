import { afterEach, expect, test, vi } from "vite-plus/test"
import Snow from "./snow"

afterEach(() => vi.unstubAllGlobals())

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
