import type { CanvasSize, SnowSettings } from "./snow"
import SnowFlake from "./snowflake"
import { randomExponential, randomNormal } from "./random"

interface Arrival {
  flake: SnowFlake
  /** Seconds from entry until the end of this frame. */
  age: number
}

interface ArrivalStep {
  deltaTime: number
  settings: SnowSettings
  bounds: CanvasSize
  onArrival: (arrival: Arrival) => void
}

interface EntryGeometry {
  flake: SnowFlake
  bounds: CanvasSize
}

/**
 * Generate edge arrivals that maintain the requested visible population.
 *
 * For any speed, direction, and size category:
 * arrival rate = target visible count * desired category fraction * crossing rate.
 * Average time visible is 1 / crossing rate, so the visible count has the desired fraction.
 *
 * Candidates are first weighted by speed, then accepted with probability
 * crossingRate / (speed * crossingBound). The speed factors cancel. The candidate
 * rate supplies the matching geometric bound, leaving the required crossing rate.
 * Rejected candidates consume their wait; retrying them would inflate arrivals.
 * Autofill samples the visible population directly and does not use this weighting.
 */
export default function createArrivals() {
  // Unspent candidate wait in rate-independent units, preserved across rate changes.
  let remainingArrivalIntensity: number | null = null

  const advance = ({ deltaTime, settings, bounds, onArrival }: ArrivalStep): void => {
    const { width, height } = bounds

    if (width === 0 || height === 0 || settings.density === 0 || deltaTime <= 0) {
      return
    }

    const proposal = speedProposal(settings)

    // width * height * crossingBound equals hypot(width, height).
    // Generate enough candidates to cover every speed and direction, then reject the excess.
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
    let nextArrival = remainingArrivalIntensity ?? randomExponential()

    while (candidateRate * timeLeft >= nextArrival) {
      timeLeft -= nextArrival / candidateRate
      nextArrival = randomExponential()
      const speed = sampleArrivalSpeed(proposal)

      if (speed === undefined) {
        continue
      }

      const snowFlake = new SnowFlake(settings, speed)

      // Faster crossings need more arrivals to maintain the same visible population.
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

/** Fraction of a uniform population crossing the edges per second at this velocity. */
const crossingRate = ({ flake, bounds: { width, height } }: EntryGeometry): number =>
  Math.abs(flake.velocityX) / (width + flake.size) +
  Math.abs(flake.velocityY) / (height + flake.size)

/** Choose an incoming edge and position, weighted to maintain even coverage. */
const enter = ({ flake, bounds: { width, height } }: EntryGeometry): void => {
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

/** Candidate speed distribution; component weights have units of CSS pixels per second. */
interface SpeedProposal {
  /** Requested mean of the visible speed distribution, before clamping at zero. */
  mean: number
  /** Absolute value of the requested speed deviation. */
  deviation: number
  /** Weight of the normal component; zero for nonpositive means. */
  normalWeight: number
  /** Weight of the Rayleigh tail that covers faster candidates. */
  tailWeight: number
}

/**
 * Build a candidate distribution covering the desired arrival speeds.
 * A normal handles the center; a Rayleigh tail covers rare fast flakes without a cutoff.
 * The component weights also set the candidate rate in advance.
 */
const speedProposal = ({ meanSpeed, sdSpeed }: SnowSettings): SpeedProposal => {
  const deviation = Math.abs(sdSpeed)
  const negativeMean = deviation === 0 ? 0 : Math.min(0, meanSpeed) / deviation

  return {
    mean: meanSpeed,
    deviation,
    normalWeight: Math.max(0, meanSpeed),
    tailWeight: (deviation / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * negativeMean ** 2),
  }
}

/**
 * Accept candidates in proportion to the desired speed-weighted normal distribution.
 * Returning undefined discards this arrival; retrying would inflate the arrival rate.
 */
const sampleArrivalSpeed = ({
  mean,
  deviation,
  normalWeight,
  tailWeight,
}: SpeedProposal): number | undefined => {
  if (Math.random() * (normalWeight + tailWeight) < normalWeight) {
    const speed = randomNormal(mean, deviation)

    if (speed > 0 && (speed >= normalWeight || Math.random() * normalWeight < speed)) {
      return speed
    }

    return undefined
  }

  const speed = normalWeight + deviation * Math.sqrt(2 * randomExponential())

  // Negative means need fewer fast arrivals than the unshifted tail supplies.
  if (mean < 0 && Math.random() >= Math.exp((mean / deviation) * (speed / deviation))) {
    return undefined
  }

  return Number.isFinite(speed) && speed > 0 ? speed : undefined
}
