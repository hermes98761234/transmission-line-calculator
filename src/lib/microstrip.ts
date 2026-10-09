/**
 * Single microstrip: Hammerstad-Jensen (1980) static model with the finite-thickness
 * correction, Kirschning-Jansen (1982) dispersion, and the Kirschning-Jansen (1984)
 * quasi-static coupled-line model for even/odd modes.
 * Geometry in any one unit (w, h, t must share it).
 */

const f = (u: number) => 6 + (2 * Math.PI - 6) * Math.exp(-Math.pow(30.666 / u, 0.7528))

/** Impedance of the strip in air (no thickness), ohm. */
export function z01(u: number): number {
  return 60 * Math.log(f(u) / u + Math.sqrt(1 + 4 / (u * u)))
}

/** Hammerstad-Jensen static effective permittivity for a zero-thickness strip. */
export function eeffThin(u: number, er: number): number {
  const a =
    1 +
    Math.log((Math.pow(u, 4) + Math.pow(u / 52, 2)) / (Math.pow(u, 4) + 0.432)) / 49 +
    Math.log(1 + Math.pow(u / 18.1, 3)) / 18.7
  const b = 0.564 * Math.pow((er - 0.9) / (er + 3), 0.053)
  return (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 10 / u, -a * b)
}

/** Width increments (in units of h) for strip thickness t, HJ eq. for u1 and ur. */
export function thicknessDeltaU(u: number, t: number, h: number, er: number): { du1: number; dur: number } {
  if (!(t > 0)) return { du1: 0, dur: 0 }
  const x = t / h
  const th = Math.tanh(Math.sqrt(6.517 * u))
  const du1 = (x / Math.PI) * Math.log(1 + (4 * Math.E * th * th) / x)
  const dur = 0.5 * (1 + 1 / Math.cosh(Math.sqrt(er - 1))) * du1
  return { du1, dur }
}

export interface Static {
  z0: number
  eeff: number
}

/** Static Z0 and effective permittivity of a microstrip of width w, thickness t on height h. */
export function microstripStatic(w: number, h: number, t: number, er: number): Static {
  const u = w / h
  const { du1, dur } = thicknessDeltaU(u, t, h, er)
  const u1 = u + du1
  const ur = u + dur
  const eeffr = eeffThin(ur, er)
  const z0 = z01(ur) / Math.sqrt(eeffr)
  const ratio = z01(u1) / z01(ur)
  return { z0, eeff: eeffr * ratio * ratio }
}

/**
 * Kirschning-Jansen dispersion of the effective permittivity.
 * hMm: substrate height in mm, fGHz: frequency in GHz, u = w/h. (The published fit uses f in GHz and h in cm.)
 */
export function eeffDispersion(u: number, er: number, eeff0: number, hMm: number, fGHz: number): number {
  const fn = fGHz * (hMm / 10)
  const p1 = 0.27488 + (0.6315 + 0.525 / Math.pow(1 + 0.0157 * fn, 20)) * u - 0.065683 * Math.exp(-8.7513 * u)
  const p2 = 0.33622 * (1 - Math.exp(-0.03442 * er))
  const p3 = 0.0363 * Math.exp(-4.6 * u) * (1 - Math.exp(-Math.pow(fn / 38.7, 4.97)))
  const p4 = 1 + 2.751 * (1 - Math.exp(-Math.pow(er / 15.916, 8)))
  const p = p1 * p2 * Math.pow((0.1844 + p3 * p4) * 10 * fn, 1.5763)
  return er - (er - eeff0) / (1 + p)
}

/** Frequency-dependent impedance (power-current definition approximated from eeff(f)). */
export function z0Dispersion(z0: number, eeff0: number, eefff: number): number {
  if (eeff0 <= 1 + 1e-9) return z0
  return z0 * Math.sqrt(eeff0 / eefff) * ((eefff - 1) / (eeff0 - 1))
}

export interface Coupled {
  z0e: number
  z0o: number
  eeffE: number
  eeffO: number
}

/** Kirschning-Jansen quasi-static even/odd modes. u = w/h, g = s/h (thin strips). Valid for 0.1<=u,g<=10. */
export function coupledStaticThin(u: number, g: number, er: number): Coupled {
  const eeffSl = eeffThin(u, er)
  const zl = z01(u) / Math.sqrt(eeffSl)

  // even mode permittivity
  const v = (u * (20 + g * g)) / (10 + g * g) + g * Math.exp(-g)
  const ae =
    1 +
    Math.log((Math.pow(v, 4) + Math.pow(v / 52, 2)) / (Math.pow(v, 4) + 0.432)) / 49 +
    Math.log(1 + Math.pow(v / 18.1, 3)) / 18.7
  const be = 0.564 * Math.pow((er - 0.9) / (er + 3), 0.053)
  const eeffE = (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 10 / v, -ae * be)

  // odd mode permittivity
  const ao = 0.7287 * (eeffSl - (er + 1) / 2) * (1 - Math.exp(-0.179 * u))
  const bo = (0.747 * er) / (0.15 + er)
  const co = bo - (bo - 0.207) * Math.exp(-0.414 * u)
  const dO = 0.593 + 0.694 * Math.exp(-0.562 * u)
  const eeffO = ((er + 1) / 2 + ao - eeffSl) * Math.exp(-co * Math.pow(g, dO)) + eeffSl

  // impedances
  const q1 = 0.8695 * Math.pow(u, 0.194)
  const q2 = 1 + 0.7519 * g + 0.189 * Math.pow(g, 2.31)
  const q3 =
    0.1975 +
    Math.pow(16.6 + Math.pow(8.4 / g, 6), -0.387) +
    Math.log((Math.pow(g, 10)) / (1 + Math.pow(g / 3.4, 10))) / 241
  const q4 = ((2 * q1) / q2) * (1 / (Math.exp(-g) * Math.pow(u, q3) + (2 - Math.exp(-g)) * Math.pow(u, -q3)))
  const q5 = 1.794 + 1.14 * Math.log(1 + 0.638 / (g + 0.517 * Math.pow(g, 2.43)))
  const q6 =
    0.2305 +
    Math.log(Math.pow(g, 10) / (1 + Math.pow(g / 5.8, 10))) / 281.3 +
    Math.log(1 + 0.598 * Math.pow(g, 1.154)) / 5.1
  const q7 = (10 + 190 * g * g) / (1 + 82.3 * g * g * g)
  const q8 = Math.exp(-6.5 - 0.95 * Math.log(g) - Math.pow(g / 0.15, 5))
  const q9 = Math.log(q7) * (q8 + 1 / 16.5)
  const q10 = (q2 * q4 - q5 * Math.exp(Math.log(u) * q6 * Math.pow(u, -q9))) / q2

  const sq = Math.sqrt(eeffSl)
  const z0e = (zl * Math.sqrt(eeffSl / eeffE)) / (1 - (zl * sq * q4) / 377)
  const z0o = (zl * Math.sqrt(eeffSl / eeffO)) / (1 - (zl * sq * q10) / 377)
  return { z0e, z0o, eeffE, eeffO }
}

/**
 * Edge-coupled microstrip. Strip thickness is included as an effective widening
 * (Hammerstad-Jensen du_r) of each strip, which narrows the gap by the same amount.
 */
export function coupledMicrostrip(w: number, s: number, h: number, t: number, er: number): Coupled {
  const u = w / h
  const { dur } = thicknessDeltaU(u, t, h, er)
  const ue = u + dur
  const ge = Math.max(s / h - dur, 0.02)
  return coupledStaticThin(ue, ge, er)
}
