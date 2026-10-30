/** Draw uniformly between 0 and 1, excluding both endpoints. */
function randomPositiveUniform(): number {
  let probability = 0

  while (probability === 0) {
    probability = Math.random()
  }

  return probability
}

/** Draw a positive number from an exponential distribution with mean 1. */
export function randomExponential(): number {
  return -Math.log(randomPositiveUniform())
}

/** Draw a normal sample with the given mean and absolute standard deviation. */
export function randomNormal(mean = 0, sd = 1): number {
  if (sd === 0) {
    return mean
  }

  // The Box-Muller transform turns two uniform draws into one normal sample.
  const u = randomPositiveUniform()
  const v = randomPositiveUniform()

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * Math.abs(sd) + mean
}

/** Convert degrees to radians. */
export function toRadians(degrees: number): number {
  return (degrees / 180) * Math.PI
}
