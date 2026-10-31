import type { SnowSettings } from "./snow.ts"

/** Shared by the core and the element, kept out of the core entry so it stays private. */
export const defaultSettings: SnowSettings = {
  flakeSize: 10,
  flakeSizeDeviation: 2,
  flakeSpeed: 150,
  flakeSpeedDeviation: 10,
  flakeDirection: 0,
  flakeDirectionDeviation: 5,
  flakeColor: "rgba(255,255,255,0.9)",
  density: 30,
  fillMode: "instant",
  showFps: false,
  paused: false,
}
