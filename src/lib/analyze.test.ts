import { describe, expect, it } from 'vitest'
import {
  analyze,
  roughnessFactor,
  skinDepthUm,
  synthesize,
  targetImpedance,
  validate,
  type Input,
} from './analyze.ts'
import { coaxZ0 } from './coax.ts'
import { impedanceVsWidth, lossVsFrequency } from './sweep.ts'

const base: Input = {
  type: 'microstrip',
  w: 3,
  h: 1.6,
  t: 0.035,
  s: 0.2,
  er: 4.3,
  tand: 0.02,
  freq: 1,
  sigma: 5.8e7,
  rough: 0,
}

describe('skin depth and roughness', () => {
  it('copper skin depth is 2.09 um at 1 GHz and 0.66 um at 10 GHz', () => {
    expect(skinDepthUm(1, 5.8e7)).toBeCloseTo(2.09, 2)
    expect(skinDepthUm(10, 5.8e7)).toBeCloseTo(0.66, 2)
  })
  it('Hammerstad roughness factor runs from 1 to 2', () => {
    expect(roughnessFactor(0, 1)).toBe(1)
    expect(roughnessFactor(1000, 1)).toBeCloseTo(2, 2)
    expect(roughnessFactor(1, 1)).toBeCloseTo(1 + (2 / Math.PI) * Math.atan(1.4), 12)
  })
})

describe('synthesis against published 50 ohm widths', () => {
  it('Pozar example 3.? er = 2.2, h = 1.59 mm gives W/h = 3.08 (W = 4.9 mm)', () => {
    const r = synthesize({ ...base, er: 2.2, h: 1.59, t: 0 }, 50)
    expect(r.ok).toBe(true)
    expect(r.w / 1.59).toBeGreaterThan(3.0)
    expect(r.w / 1.59).toBeLessThan(3.2)
  })
  it('FR-4 (er 4.4), 1.6 mm board: about 3.0 mm', () => {
    const r = synthesize({ ...base, er: 4.4, t: 0.035 }, 50)
    expect(r.w).toBeGreaterThan(2.9)
    expect(r.w).toBeLessThan(3.15)
  })
  it('Rogers RO4003C, 20 mil: about 1.1 mm', () => {
    const r = synthesize({ ...base, er: 3.38, h: 0.508, t: 0.035 }, 50)
    expect(r.w).toBeGreaterThan(1.05)
    expect(r.w).toBeLessThan(1.2)
  })
  it('synthesis is the inverse of analysis for every line type', () => {
    const cases: Partial<Input>[] = [
      { type: 'microstrip' },
      { type: 'stripline', h: 1.0, w: 0.4 },
      { type: 'cpw', w: 1, s: 0.3 },
      { type: 'cpwg', w: 1, s: 0.3 },
      { type: 'coupled', w: 1, s: 0.5 },
      { type: 'coax', w: 0.9, h: 3.0, er: 2.1 },
    ]
    for (const c of cases) {
      const inp = { ...base, ...c }
      const z = targetImpedance(inp)
      const r = synthesize({ ...inp, w: 123 }, z)
      expect(r.ok).toBe(true)
      expect(r.w).toBeCloseTo(inp.w, 3)
    }
  })
  it('reports an unreachable target', () => {
    expect(synthesize(base, 0.5).ok).toBe(false)
    expect(synthesize(base, 400).ok).toBe(false)
    expect(synthesize(base, 400).reason).toBe('high')
  })
})

describe('analyze', () => {
  it('50 ohm FR-4 microstrip has Z0 near 50 and eeff near 3.2', () => {
    const a = analyze({ ...base, w: 3.07 })
    expect(a.modes[0].z0).toBeGreaterThan(49)
    expect(a.modes[0].z0).toBeLessThan(51)
    expect(a.modes[0].eeff).toBeGreaterThan(3.1)
    expect(a.modes[0].eeff).toBeLessThan(3.4)
  })
  it('delay and wavelength follow from eeff', () => {
    const m = analyze({ ...base, freq: 2 }).modes[0]
    expect(m.delay).toBeCloseTo((Math.sqrt(m.eeff) / 299792458) * 1e9, 9)
    expect(m.wavelength).toBeCloseTo(299792458 / 2e9 / Math.sqrt(m.eeff) * 1e3, 6)
  })
  it('dielectric loss in stripline is 27.3 sqrt(er) tan(d) / lambda0 dB', () => {
    const inp: Input = { ...base, type: 'stripline', h: 1, w: 0.4, freq: 5, er: 4, tand: 0.01 }
    const lambda0 = 299792458 / 5e9
    const expected = (27.3 * 2 * 0.01) / lambda0
    expect(analyze(inp).modes[0].alphaD).toBeCloseTo(expected, 1)
  })
  it('loss grows with frequency: conductor ~ sqrt(f), dielectric ~ f', () => {
    const a1 = analyze({ ...base, freq: 1 }).modes[0]
    const a4 = analyze({ ...base, freq: 4 }).modes[0]
    expect(a4.alphaC / a1.alphaC).toBeGreaterThan(1.9)
    expect(a4.alphaC / a1.alphaC).toBeLessThan(2.1)
    expect(a4.alphaD / a1.alphaD).toBeGreaterThan(3.9)
    expect(a4.alphaD / a1.alphaD).toBeLessThan(4.6)
  })
  it('roughness increases conductor loss, up to a factor of two', () => {
    const smooth = analyze({ ...base, freq: 10 }).modes[0].alphaC
    const rough = analyze({ ...base, freq: 10, rough: 3 }).modes[0].alphaC
    expect(rough / smooth).toBeGreaterThan(1.5)
    expect(rough / smooth).toBeLessThanOrEqual(2.0001)
  })
  it('conductor loss of a wide microstrip approaches Rs / (Z0 w)', () => {
    const inp = { ...base, w: 20, h: 1.6, t: 0.035, freq: 1, er: 1 }
    const m = analyze(inp).modes[0]
    const rs = 1 / (5.8e7 * 2.09e-6)
    const simple = ((rs / (m.z0 * 0.02)) * 20) / Math.LN10
    expect(m.alphaC / simple).toBeGreaterThan(0.5)
    expect(m.alphaC / simple).toBeLessThan(2)
  })
  it('coaxial line: Z0 = 60 / sqrt(er) ln(D/d); RG-402 style 0.91 / 3.0 mm in PTFE is ~50 ohm', () => {
    expect(coaxZ0(0.91, 3.0, 2.1)).toBeGreaterThan(49)
    expect(coaxZ0(0.91, 3.0, 2.1)).toBeLessThan(50.5)
    const a = analyze({ ...base, type: 'coax', w: 0.91, h: 3.0, er: 2.1, tand: 0.0002, freq: 1 })
    expect(a.modes[0].eeff).toBe(2.1)
    // alpha_c = Rs (1/a + 1/b) / (4 pi Z0) in Np/m
    const rs = 1 / (5.8e7 * skinDepthUm(1, 5.8e7) * 1e-6)
    const expected = ((rs * (1 / 0.455e-3 + 1 / 1.5e-3)) / (4 * Math.PI * a.modes[0].z0)) * (20 / Math.LN10)
    expect(a.modes[0].alphaC).toBeCloseTo(expected, 6)
  })
  it('coupled lines report even/odd, differential and common impedance', () => {
    const a = analyze({ ...base, type: 'coupled', w: 1.5, s: 0.5 })
    expect(a.modes.map((m) => m.id)).toEqual(['even', 'odd'])
    expect(a.modes[0].z0).toBeGreaterThan(a.modes[1].z0)
    expect(a.zdiff).toBeCloseTo(2 * a.modes[1].z0, 9)
    expect(a.zcomm).toBeCloseTo(a.modes[0].z0 / 2, 9)
  })
  it('zero thickness does not break the loss calculation', () => {
    const a = analyze({ ...base, t: 0 }).modes[0]
    expect(Number.isFinite(a.alphaC)).toBe(true)
    expect(a.alphaC).toBeGreaterThan(0)
  })
  it('every line type yields finite positive numbers', () => {
    const cases: Partial<Input>[] = [
      { type: 'microstrip' },
      { type: 'stripline', h: 1.0, w: 0.4 },
      { type: 'cpw', w: 1, s: 0.3 },
      { type: 'cpwg', w: 1, s: 0.3 },
      { type: 'coupled', w: 1, s: 0.5 },
      { type: 'coax', w: 0.9, h: 3.0, er: 2.1 },
    ]
    for (const c of cases) {
      for (const m of analyze({ ...base, ...c }).modes) {
        for (const v of [m.z0, m.eeff, m.delay, m.wavelength, m.alphaC, m.alphaD, m.alphaT]) {
          expect(Number.isFinite(v)).toBe(true)
          expect(v).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})

describe('validate', () => {
  it('flags impossible geometries', () => {
    expect([...validate({ ...base, w: 0 })]).toContain('w')
    expect([...validate({ ...base, type: 'coax', w: 3, h: 2 })]).toContain('h')
    expect([...validate({ ...base, type: 'cpw', s: 0 })]).toContain('s')
    expect([...validate({ ...base, type: 'stripline', t: 5, h: 1 })]).toContain('t')
    expect(validate(base).size).toBe(0)
  })
})

describe('sweeps', () => {
  it('impedance vs width falls and matches the point value', () => {
    const s = impedanceVsWidth(base, 20)
    expect(s.x).toHaveLength(20)
    const y = s.series[0].y
    for (let i = 1; i < y.length; i++) expect(y[i]).toBeLessThan(y[i - 1])
  })
  it('coupled sweep returns even, odd and differential series', () => {
    const s = impedanceVsWidth({ ...base, type: 'coupled', w: 1, s: 0.5 }, 10)
    expect(s.series.map((x) => x.id)).toEqual(['even', 'odd', 'diff'])
  })
  it('loss vs frequency increases and total = conductor + dielectric', () => {
    const s = lossVsFrequency(base, 0.1, 40, 15)
    const [c, d, t] = s.series
    for (let i = 0; i < s.x.length; i++) expect(t.y[i]).toBeCloseTo(c.y[i] + d.y[i], 9)
    for (let i = 1; i < s.x.length; i++) expect(t.y[i]).toBeGreaterThan(t.y[i - 1])
  })
})
