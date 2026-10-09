import { describe, expect, it } from 'vitest'
import { coupledStaticThin, eeffDispersion, eeffThin, microstripStatic, z01, z0Dispersion } from './microstrip.ts'

describe('Hammerstad-Jensen single microstrip', () => {
  it('air-line impedance at w/h = 1 is 126.5 ohm', () => {
    expect(z01(1)).toBeCloseTo(126.5, 1)
  })
  it('wide-strip limit approaches the parallel-plate impedance 377 / (sqrt(er) (w/h))', () => {
    const u = 40
    const z = z01(u) / Math.sqrt(eeffThin(u, 4))
    const plate = 377 / 2 / u
    // fringing makes the real strip look slightly wider than the plate
    expect(z).toBeLessThan(plate)
    expect(z).toBeGreaterThan(0.9 * plate)
  })
  it('er = 1 gives eeff = 1 and the air impedance', () => {
    const m = microstripStatic(1.6, 1.6, 0.035, 1)
    expect(m.eeff).toBeCloseTo(1, 9)
    expect(eeffThin(0.7, 1)).toBeCloseTo(1, 12)
  })
  it('eeff for w/h = 1, er = 9.8 (alumina) is 6.58 (hand evaluation of the HJ formula)', () => {
    expect(eeffThin(1, 9.8)).toBeCloseTo(6.58, 2)
  })
  it('eeff for w/h = 2, er = 4.4 (FR-4) is about 3.3', () => {
    expect(eeffThin(2, 4.4)).toBeGreaterThan(3.25)
    expect(eeffThin(2, 4.4)).toBeLessThan(3.4)
  })
  it('a thicker strip has lower impedance and a slightly smaller eeff', () => {
    const thin = microstripStatic(3, 1.6, 0, 4.3)
    const thick = microstripStatic(3, 1.6, 0.07, 4.3)
    expect(thick.z0).toBeLessThan(thin.z0)
    expect(thick.eeff).toBeLessThan(thin.eeff)
    expect(thick.eeff).toBeGreaterThan(0.95 * thin.eeff)
    expect(thin.z0 - thick.z0).toBeLessThan(5)
  })
  it('impedance falls monotonically with width', () => {
    let prev = Infinity
    for (let u = 0.1; u < 20; u *= 1.2) {
      const z = microstripStatic(u, 1, 0.02, 4.3).z0
      expect(z).toBeLessThan(prev)
      prev = z
    }
  })
})

describe('Kirschning-Jansen dispersion', () => {
  it('vanishes at DC and tends to er at high frequency', () => {
    const e0 = eeffThin(1.9, 4.3)
    expect(eeffDispersion(1.9, 4.3, e0, 1.6, 1e-6)).toBeCloseTo(e0, 6)
    expect(eeffDispersion(1.9, 4.3, e0, 1.6, 500)).toBeGreaterThan(4.0)
    expect(eeffDispersion(1.9, 4.3, e0, 1.6, 500)).toBeLessThan(4.3)
  })
  it('is monotonic in frequency and small at 1 GHz on 1.6 mm FR-4', () => {
    const e0 = eeffThin(1.9, 4.3)
    let prev = e0
    for (const f of [0.5, 1, 2, 5, 10, 20]) {
      const e = eeffDispersion(1.9, 4.3, e0, 1.6, f)
      expect(e).toBeGreaterThan(prev)
      prev = e
    }
    expect(eeffDispersion(1.9, 4.3, e0, 1.6, 1) / e0 - 1).toBeLessThan(0.01)
    expect(eeffDispersion(1.9, 4.3, e0, 1.6, 10) / e0 - 1).toBeGreaterThan(0.05)
  })
  it('impedance dispersion is neutral without dispersion', () => {
    expect(z0Dispersion(50, 3, 3)).toBeCloseTo(50, 12)
  })
})

describe('Kirschning-Jansen coupled microstrip (static)', () => {
  it('orders Z0e > Z0 > Z0o and eeffE > eeffO', () => {
    const c = coupledStaticThin(1, 0.5, 4.3)
    const z = z01(1) / Math.sqrt(eeffThin(1, 4.3))
    expect(c.z0e).toBeGreaterThan(z)
    expect(c.z0o).toBeLessThan(z)
    expect(c.eeffE).toBeGreaterThan(c.eeffO)
  })
  it('converges to the single line for a very wide gap', () => {
    const z = z01(1) / Math.sqrt(eeffThin(1, 4.3))
    const c = coupledStaticThin(1, 10, 4.3)
    expect(c.z0e).toBeCloseTo(z, -0.5)
    expect(Math.abs(c.z0e - z) / z).toBeLessThan(0.02)
    expect(Math.abs(c.z0o - z) / z).toBeLessThan(0.02)
  })
  it('coupling increases as the gap shrinks', () => {
    const near = coupledStaticThin(1, 0.2, 4.3)
    const far = coupledStaticThin(1, 1, 4.3)
    expect(near.z0e - near.z0o).toBeGreaterThan(far.z0e - far.z0o)
  })
  it('in air both modes have eeff = 1', () => {
    const c = coupledStaticThin(1, 0.5, 1)
    expect(c.eeffE).toBeCloseTo(1, 6)
    expect(c.eeffO).toBeCloseTo(1, 6)
  })
})
