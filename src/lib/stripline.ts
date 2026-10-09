import { kRatio } from './elliptic.ts'

/** Cohn's exact zero-thickness symmetric stripline: Z0 = 30 pi / sqrt(er) * K'(k)/K(k), k = tanh(pi w / 2b). */
export function striplineThin(w: number, b: number, er: number): number {
  const x = (Math.PI * w) / (2 * b)
  return ((30 * Math.PI) / Math.sqrt(er)) * kRatio(Math.tanh(x), 1 / Math.cosh(x))
}

/** Cohn's edge-fringing term for a strip of relative thickness x = t/b (per unit permittivity, normalised to the gap). */
export function striplineFringe(x: number): number {
  const m = 1 / (1 - x)
  const term = (a: number) => (a > 0 ? a * Math.log(a) : 0)
  return (term(m + 1) - term(m - 1)) / Math.PI
}

/**
 * Symmetric stripline between two ground planes spaced b apart, centre strip w x t.
 * Thin strips use Cohn's exact elliptic solution. Thickness enters as Cohn's effective width
 * w_e = w b / (b - t) + b (Cf - 2 ln2 / pi), which reproduces the wide-strip result
 * Z0 = 94.15 / (sqrt(er) (w / (b - t) + Cf)) and degrades gracefully for narrow strips.
 */
export function stripline(w: number, b: number, t: number, er: number): number {
  if (!(t > 0)) return striplineThin(w, b, er)
  const x = t / b
  const we = (w * b) / (b - t) + b * (striplineFringe(x) - (2 * Math.LN2) / Math.PI)
  return striplineThin(we, b, er)
}
