import { describe, expect, it } from 'vitest'
import { cpw } from './cpw.ts'

describe('coplanar waveguide (conformal mapping)', () => {
  it('air line with k = 1/sqrt2 has Z0 = 30 pi', () => {
    const w = 1
    const s = (w * (Math.SQRT2 - 1)) / 2
    const m = cpw(w, s, 100, 0, 1, false)
    expect(m.z0).toBeCloseTo(30 * Math.PI, 3)
    expect(m.eeff).toBeCloseTo(1, 9)
  })
  it('on a thick substrate eeff tends to (er + 1) / 2', () => {
    expect(cpw(1, 0.3, 1000, 0, 10, false).eeff).toBeCloseTo(5.5, 2)
  })
  it('a ground plane lowers the impedance and raises eeff (thin substrate)', () => {
    const open = cpw(1, 0.3, 1.0, 0, 4.3, false)
    const gnd = cpw(1, 0.3, 1.0, 0, 4.3, true)
    expect(gnd.z0).toBeLessThan(open.z0)
    expect(gnd.eeff).toBeGreaterThan(open.eeff)
  })
  it('grounded CPW on a very thick substrate converges to the ungrounded line', () => {
    const a = cpw(1, 0.3, 200, 0, 4.3, true)
    const b = cpw(1, 0.3, 200, 0, 4.3, false)
    expect(Math.abs(a.z0 - b.z0) / b.z0).toBeLessThan(1e-3)
    expect(a.eeff).toBeCloseTo(b.eeff, 3)
  })
  it('a wider gap raises the impedance', () => {
    expect(cpw(1, 0.5, 1.6, 0, 4.3, false).z0).toBeGreaterThan(cpw(1, 0.2, 1.6, 0, 4.3, false).z0)
  })
  it('metal thickness lowers Z0 and eeff', () => {
    const thin = cpw(0.5, 0.25, 1.6, 0, 4.3, true)
    const thick = cpw(0.5, 0.25, 1.6, 0.035, 4.3, true)
    expect(thick.z0).toBeLessThan(thin.z0)
    expect(thick.eeff).toBeLessThan(thin.eeff)
  })
})
