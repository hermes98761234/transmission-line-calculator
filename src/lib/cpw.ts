import { kRatio } from './elliptic.ts'
import type { Static } from './microstrip.ts'

/**
 * Coplanar waveguide by conformal mapping (Simons, Coplanar Waveguide Circuits).
 * w: centre conductor width, s: gap to each ground, h: substrate height, t: metal thickness.
 * grounded = conductor-backed CPW (ground plane on the back of the substrate).
 * Thickness uses Gupta's effective width/gap correction and eeff reduction.
 */
export function cpw(w: number, s: number, h: number, t: number, er: number, grounded: boolean): Static {
  let we = w
  let se = s
  if (t > 0) {
    const d = ((1.25 * t) / Math.PI) * (1 + Math.log((4 * Math.PI * w) / t))
    we = w + d
    se = Math.max(s - d, 1e-6 * s)
  }
  const a = we / 2
  const b = we / 2 + se
  const k = a / b
  const kk = kRatio(k) // K'(k)/K(k)
  let eeff: number
  let z0: number
  if (grounded) {
    const k3 = Math.tanh((Math.PI * a) / (2 * h)) / Math.tanh((Math.PI * b) / (2 * h))
    const r3 = 1 / kRatio(k3) // K(k3)/K'(k3)
    eeff = (1 + er * kk * r3) / (1 + kk * r3)
    z0 = (60 * Math.PI) / Math.sqrt(eeff) / (1 / kk + r3)
  } else {
    const k1 = Math.sinh((Math.PI * a) / (2 * h)) / Math.sinh((Math.PI * b) / (2 * h))
    eeff = 1 + ((er - 1) / 2) * (kk / kRatio(k1))
    z0 = ((30 * Math.PI) / Math.sqrt(eeff)) * kk
  }
  if (t > 0) {
    const kt = 1 / kk // K(k)/K'(k)
    eeff = eeff - (0.7 * (eeff - 1) * (t / s)) / (kt + 0.7 * (t / s))
    // recompute Z0 with the thickness-corrected eeff, same geometry factor
    if (grounded) {
      const k3 = Math.tanh((Math.PI * a) / (2 * h)) / Math.tanh((Math.PI * b) / (2 * h))
      z0 = (60 * Math.PI) / Math.sqrt(eeff) / (1 / kk + 1 / kRatio(k3))
    } else z0 = ((30 * Math.PI) / Math.sqrt(eeff)) * kk
  }
  return { z0, eeff }
}
