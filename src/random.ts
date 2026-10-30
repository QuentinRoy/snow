/** Draw uniformly between 0 and 1, excluding zero so logarithms stay finite. */
const randomPositiveUniform = (): number => {
  let probability = 0

  while (probability === 0) {
    probability = Math.random()
  }

  return probability
}

/** Draw a random wait with mean 1; divide by the candidate rate to get seconds. */
export const randomExponential = (): number => -Math.log(randomPositiveUniform())

/** Draw a normal sample with the given mean and absolute standard deviation. */
export const randomNormal = (mean = 0, sd = 1) => {
  if (sd === 0) {
    return mean
  }

  // The Box-Muller transform turns two uniform draws into one normal sample.
  const u = randomPositiveUniform()
  const v = randomPositiveUniform()

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * Math.abs(sd) + mean
}
