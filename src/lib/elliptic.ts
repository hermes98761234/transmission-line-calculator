/** Arithmetic-geometric mean. */
export function agm(a: number, b: number): number {
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * a; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)]
  return (a + b) / 2
}

/** Complete elliptic integral of the first kind K(k), modulus k (0 <= k < 1). */
export function ellipK(k: number): number {
  return Math.PI / (2 * agm(1, Math.sqrt(1 - k * k)))
}

/**
 * Ratio K'(k)/K(k), where K'(k) = K(sqrt(1-k^2)).
 * Pass the complementary modulus kp when it is known accurately (e.g. k close to 1).
 */
export function kRatio(k: number, kp = Math.sqrt(Math.max(0, 1 - k * k))): number {
  return agm(1, kp) / agm(1, Math.max(k, 1e-300))
}
