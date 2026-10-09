import { C0, ETA0, NP_TO_DB } from './constants.ts'
import { coaxZ0 } from './coax.ts'
import { cpw } from './cpw.ts'
import {
  coupledMicrostrip,
  eeffDispersion,
  microstripStatic,
  z0Dispersion,
} from './microstrip.ts'
import { stripline } from './stripline.ts'

export type LineType = 'microstrip' | 'stripline' | 'cpw' | 'cpwg' | 'coupled' | 'coax'
export const LINE_TYPES: LineType[] = ['microstrip', 'stripline', 'cpw', 'cpwg', 'coupled', 'coax']

/**
 * All geometry in millimetres.
 * w: trace width (coax: inner diameter d), h: substrate height (stripline: ground spacing b; coax: outer diameter D),
 * t: copper thickness, s: gap (CPW: to each ground; coupled: between the two traces).
 */
export interface Input {
  type: LineType
  w: number
  h: number
  t: number
  s: number
  er: number
  tand: number
  /** GHz */
  freq: number
  /** Conductor conductivity, S/m. */
  sigma: number
  /** RMS surface roughness, micrometres. */
  rough: number
}

export type ModeId = 'single' | 'even' | 'odd'

export interface Mode {
  id: ModeId
  z0: number
  eeff: number
  /** ns/m */
  delay: number
  /** mm */
  wavelength: number
  /** dB/m */
  alphaC: number
  alphaD: number
  alphaT: number
}

export interface Analysis {
  modes: Mode[]
  /** Skin depth in micrometres. */
  skinDepth: number
  /** Differential impedance (coupled only), ohm. */
  zdiff?: number
  /** Common-mode impedance (coupled only), ohm. */
  zcomm?: number
  warnings: string[]
}

interface Raw {
  id: ModeId
  z0: number
  eeff: number
}

/** Smallest metal thickness used in the models (mm). Zero-thickness metal has no meaningful conductor loss. */
const T_MIN = 1e-3

/** Static (low-frequency) impedance and permittivity of each mode, with optional metal recession r (mm). */
function staticModes(inp: Input, air: boolean, r = 0): Raw[] {
  const er = air ? 1 : inp.er
  const w = inp.w - 2 * r
  const t = Math.max(inp.t - 2 * r, 0)
  switch (inp.type) {
    case 'microstrip': {
      const m = microstripStatic(w, inp.h + 2 * r, t, er)
      return [{ id: 'single', ...m }]
    }
    case 'stripline':
      return [{ id: 'single', z0: stripline(w, inp.h + 2 * r, t, er), eeff: er }]
    case 'cpw':
    case 'cpwg': {
      const m = cpw(w, inp.s + 2 * r, inp.h + (inp.type === 'cpwg' ? 2 * r : 0), t, er, inp.type === 'cpwg')
      return [{ id: 'single', ...m }]
    }
    case 'coupled': {
      const c = coupledMicrostrip(w, inp.s + 2 * r, inp.h + 2 * r, t, er)
      return [
        { id: 'even', z0: c.z0e, eeff: c.eeffE },
        { id: 'odd', z0: c.z0o, eeff: c.eeffO },
      ]
    }
    case 'coax':
      return [{ id: 'single', z0: coaxZ0(inp.w, inp.h, er), eeff: er }]
  }
}

/** Roughness multiplier on conductor loss (Hammerstad-Jensen). */
export function roughnessFactor(rmsUm: number, skinUm: number): number {
  if (!(rmsUm > 0)) return 1
  return 1 + (2 / Math.PI) * Math.atan(1.4 * Math.pow(rmsUm / skinUm, 2))
}

/** Skin depth in micrometres. */
export function skinDepthUm(fGHz: number, sigma: number): number {
  return 1e6 / Math.sqrt(Math.PI * fGHz * 1e9 * 4e-7 * Math.PI * sigma)
}

export function validate(inp: Input): Set<keyof Input> {
  const bad = new Set<keyof Input>()
  if (!(inp.w > 0)) bad.add('w')
  if (!(inp.h > 0)) bad.add('h')
  if (!(inp.t >= 0)) bad.add('t')
  if (!(inp.er >= 1)) bad.add('er')
  if (!(inp.tand >= 0)) bad.add('tand')
  if (!(inp.freq > 0)) bad.add('freq')
  if (!(inp.rough >= 0)) bad.add('rough')
  if (!(inp.sigma > 0)) bad.add('sigma')
  if (inp.type === 'cpw' || inp.type === 'cpwg' || inp.type === 'coupled') if (!(inp.s > 0)) bad.add('s')
  if (inp.type === 'coax') {
    if (!(inp.h > inp.w)) bad.add('h')
  } else if (inp.type === 'stripline') {
    if (!(inp.t < inp.h * 0.9)) bad.add('t')
  }
  return bad
}

/** Plain-English notes for geometries outside the range the formulas were fitted for. Keys are translated in the UI. */
function warnings(inp: Input): string[] {
  const out: string[] = []
  if (inp.type === 'microstrip' && (inp.w / inp.h < 0.05 || inp.w / inp.h > 20)) out.push('Width/height is outside 0.05 to 20: accuracy drops.')
  if (inp.type === 'coupled') {
    const u = inp.w / inp.h
    const g = inp.s / inp.h
    if (u < 0.1 || u > 10 || g < 0.1 || g > 10) out.push('Coupled-line model is fitted for w/h and s/h between 0.1 and 10.')
  }
  if (inp.type === 'stripline' && inp.t / inp.h > 0.25) out.push('Stripline thickness above 25% of the spacing is outside the model range.')
  if (inp.type === 'microstrip' || inp.type === 'coupled') {
    if (inp.er > 18) out.push('Permittivity above 18 is outside the model range.')
    // TE1 surface-wave cutoff of a grounded slab: f = c / (4 h sqrt(er - 1)), c = 300 mm GHz
    const fMax = inp.er > 1 ? 300 / (4 * inp.h * Math.sqrt(inp.er - 1)) : Infinity
    if (inp.freq > fMax) out.push('Frequency is high for this substrate height: higher-order modes may appear.')
  }
  return out
}

export function analyze(inp: Input): Analysis {
  const tEff = Math.max(inp.t, T_MIN)
  const geo: Input = { ...inp, t: tEff }
  const f = inp.freq * 1e9
  const delta = skinDepthUm(inp.freq, inp.sigma)
  const rs = 1 / (inp.sigma * delta * 1e-6)
  const kr = roughnessFactor(inp.rough, delta)
  const thin = 1 / (1 - Math.exp(-(tEff * 1e-3) / (delta * 1e-6)))

  const stat = staticModes(geo, false)
  const air = staticModes(geo, true)
  const rec = 0.005 * tEff
  const airRec = staticModes(geo, true, rec)

  const modes: Mode[] = stat.map((m, i) => {
    let eeff = m.eeff
    let z0 = m.z0
    if (inp.type === 'microstrip') {
      eeff = eeffDispersion(inp.w / inp.h, inp.er, m.eeff, inp.h, inp.freq)
      z0 = z0Dispersion(m.z0, m.eeff, eeff)
    }
    // Wheeler incremental inductance: R' = Rs * dZ_air/dr / eta0 per metre (dZ/dr in ohm per m).
    let alphaC: number
    if (inp.type === 'coax') {
      const a = inp.w / 2e3
      const b = inp.h / 2e3
      const rPrime = (rs * kr * (1 / a + 1 / b)) / (2 * Math.PI)
      alphaC = (rPrime / (2 * z0)) * NP_TO_DB
    } else {
      const dz = ((airRec[i].z0 - air[i].z0) / (rec * 1e-3)) // ohm per metre of recession
      const rPrime = (rs * kr * thin * dz) / ETA0
      alphaC = (rPrime / (2 * z0)) * NP_TO_DB
    }
    let alphaD: number
    if (inp.type === 'stripline' || inp.type === 'coax') {
      alphaD = ((Math.PI * f * Math.sqrt(inp.er) * inp.tand) / C0) * NP_TO_DB
    } else {
      const fill = inp.er > 1 ? (inp.er / Math.sqrt(eeff)) * ((eeff - 1) / (inp.er - 1)) : 0
      alphaD = ((Math.PI * f * fill * inp.tand) / C0) * NP_TO_DB
    }
    return {
      id: m.id,
      z0,
      eeff,
      delay: (Math.sqrt(eeff) / C0) * 1e9,
      wavelength: (C0 / (f * Math.sqrt(eeff))) * 1e3,
      alphaC,
      alphaD,
      alphaT: alphaC + alphaD,
    }
  })
  const out: Analysis = { modes, skinDepth: delta, warnings: warnings(inp) }
  if (inp.type === 'coupled') {
    out.zdiff = 2 * modes[1].z0
    out.zcomm = modes[0].z0 / 2
  }
  return out
}

/** The single impedance that synthesis targets: Z0 (single-ended) or the differential impedance (coupled). */
export function targetImpedance(inp: Input): number {
  const m = staticModes({ ...inp, t: Math.max(inp.t, T_MIN) }, false)
  return inp.type === 'coupled' ? 2 * m[1].z0 : m[0].z0
}

export interface SynthResult {
  ok: boolean
  /** Solved width (coax: inner diameter), mm */
  w: number
  /** Why it failed, when it did. */
  reason?: 'low' | 'high'
}

/** Solve for the trace width (coax: inner diameter) that gives the target impedance by bisection. */
export function synthesize(inp: Input, target: number): SynthResult {
  const ref = inp.type === 'cpw' || inp.type === 'cpwg' ? inp.s : inp.h
  const lo0 = inp.type === 'coax' ? ref * 1e-4 : ref * 0.01
  const hi0 = inp.type === 'coax' ? ref * 0.9999 : ref * 100
  const z = (w: number) => targetImpedance({ ...inp, w })
  // Impedance falls as the trace widens.
  let lo = Math.log(lo0)
  let hi = Math.log(hi0)
  const zLo = z(Math.exp(lo))
  const zHi = z(Math.exp(hi))
  if (target > zLo) return { ok: false, w: lo0, reason: 'high' }
  if (target < zHi) return { ok: false, w: hi0, reason: 'low' }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (z(Math.exp(mid)) > target) lo = mid
    else hi = mid
  }
  return { ok: true, w: Math.exp((lo + hi) / 2) }
}
