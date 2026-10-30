import type { CanvasSize, SnowSettings } from "./snow.ts"
import { SnowFlake } from "./snow-flake.ts"
import { randomExponential, randomNormal } from "./math.ts"

/** An entering flake and its elapsed time at frame end. */
interface Arrival {
  flake: SnowFlake
  /** Seconds from entry until the end of this frame. */
  age: number
}

/** Settings and callback for one interval of arrival generation. */
interface ArrivalStep {
  deltaTime: number
  settings: SnowSettings
  bounds: CanvasSize
  onArrival: (arrival: Arrival) => void
}

/** A flake and the canvas it enters. */
interface EntryGeometry {
  flake: SnowFlake
  bounds: CanvasSize
}

/**
 * Create an independent edge-arrival generator that maintains the target visible population.
 *
 * Flakes that leave sooner must arrive more often; otherwise slow flakes would
 * dominate the scene. Arrival frequency accounts for speed, direction, and size.
 * Random timing lets the visible count fluctuate around the target.
 *
 * Each advance uses the current settings and retains unfinished timing across
 * frames and rate changes. It reports flakes at their entry positions, with their
 * elapsed time at frame end so the caller can advance them to the current frame.
 */
export function createArrivals() {
  // Store unused random spacing rather than seconds so rate changes apply immediately.
  let remainingArrivalIntensity: number | null = null

  /** Emit entries during this interval, reporting each flake's age at frame end. */
  const advance = ({ deltaTime, settings, bounds, onArrival }: ArrivalStep): void => {
    const { width, height } = bounds

    if (width === 0 || height === 0 || settings.density === 0 || deltaTime <= 0) {
      return
    }

    // For flakes with a given speed, direction, and size:
    // arrivals per second = desired visible count * crossingRate.
    const proposal = speedProposal(settings)

    // Target count * crossingBound simplifies to density / 1,000,000 * hypot(width, height).
    const candidateRate =
      (settings.density / 1_000_000) *
      Math.hypot(width, height) *
      (proposal.normalWeight + proposal.tailWeight)

    if (!Number.isFinite(candidateRate)) {
      throw new RangeError("Snowfall arrival rate must be finite")
    }

    if (candidateRate === 0) {
      return
    }

    // Upper bound on crossingRate / speed for every direction and flake size.
    const crossingBound = Math.hypot(1 / width, 1 / height)
    let timeLeft = deltaTime
    // These draws average 1; dividing by candidateRate gives seconds between candidates.
    let nextArrival = remainingArrivalIntensity ?? randomExponential()

    while (candidateRate * timeLeft >= nextArrival) {
      timeLeft -= nextArrival / candidateRate
      nextArrival = randomExponential()
      const speed = sampleArrivalSpeed(proposal)

      // Rejected candidates consume their wait; retrying would inflate arrivals.
      if (speed === undefined) {
        continue
      }

      const snowFlake = new SnowFlake(settings, speed)

      // The sampler favors speeds in proportion to speed. Dividing by speed here
      // removes that bias; multiplying by crossingRate replaces it with the weighting
      // needed to maintain the visible distribution. crossingBound keeps this a probability.
      const isAccepted =
        snowFlake.size > 0 &&
        Math.random() * speed * crossingBound < crossingRate({ flake: snowFlake, bounds })

      if (!isAccepted) {
        continue
      }

      enter({ flake: snowFlake, bounds })
      onArrival({ flake: snowFlake, age: timeLeft })
    }

    remainingArrivalIntensity = nextArrival - candidateRate * timeLeft
  }

  return { advance }
}

/** Return the crossing rate, equal to 1 / average seconds visible. */
function crossingRate({ flake, bounds: { width, height } }: EntryGeometry): number {
  // A circle stays partly visible until its center clears the edge by its radius.
  return (
    Math.abs(flake.velocityX) / (width + flake.size) +
    Math.abs(flake.velocityY) / (height + flake.size)
  )
}

/** Place the flake at a random position on an incoming edge. */
function enter({ flake, bounds: { width, height } }: EntryGeometry): void {
  const radius = flake.size / 2
  // An edge admits more flakes when it is longer or the inward motion is faster.
  const horizontalEdgeWeight = (width + flake.size) * Math.abs(flake.velocityY)
  const verticalEdgeWeight = (height + flake.size) * Math.abs(flake.velocityX)

  if (Math.random() * (horizontalEdgeWeight + verticalEdgeWeight) < horizontalEdgeWeight) {
    flake.x = Math.random() * (width + flake.size) - radius
    flake.y = flake.velocityY > 0 ? -radius : height + radius
  } else {
    flake.x = flake.velocityX > 0 ? -radius : width + radius
    flake.y = Math.random() * (height + flake.size) - radius
  }
}

/**
 * Parameters for choosing candidate speeds. The weights set each source's share
 * of candidates and, through their sum, the candidate arrival rate.
 */
interface SpeedProposal {
  /** Requested mean of the visible speed distribution, before clamping at zero. */
  mean: number
  /** Absolute value of the requested speed deviation. */
  deviation: number
  /** Weight of bell-curve candidates; zero for nonpositive means. */
  normalWeight: number
  /** Weight of extra fast candidates, needed because faster flakes must arrive more often. */
  tailWeight: number
}

/** Calculate the parameters and weights for candidate-speed sampling. */
function speedProposal({ flakeSpeed, flakeSpeedDeviation }: SnowSettings): SpeedProposal {
  const deviation = Math.abs(flakeSpeedDeviation)
  const negativeMean = deviation === 0 ? 0 : Math.min(0, flakeSpeed) / deviation

  // Extra fast candidates cover the speed weighting without limiting maximum speed.
  return {
    mean: flakeSpeed,
    deviation,
    normalWeight: Math.max(0, flakeSpeed),
    tailWeight: (deviation / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * negativeMean ** 2),
  }
}

/** Sample a positive candidate speed, or return undefined to reject it. */
function sampleArrivalSpeed({
  mean,
  deviation,
  normalWeight,
  tailWeight,
}: SpeedProposal): number | undefined {
  if (Math.random() * (normalWeight + tailWeight) < normalWeight) {
    const speed = randomNormal(mean, deviation)

    if (speed > 0 && (speed >= normalWeight || Math.random() * normalWeight < speed)) {
      return speed
    }

    return undefined
  }

  const speed = normalWeight + deviation * Math.sqrt(2 * randomExponential())

  // For a negative mean, match the positive bell curve while retaining the speed weighting.
  if (mean < 0 && Math.random() >= Math.exp((mean / deviation) * (speed / deviation))) {
    return undefined
  }

  return Number.isFinite(speed) && speed > 0 ? speed : undefined
}
