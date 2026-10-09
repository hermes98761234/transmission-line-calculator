import { describe, expect, it } from 'vitest'
import { stripline, striplineFringe, striplineThin } from './stripline.ts'

describe('stripline (Cohn/Wheeler)', () => {
  it('agrees with Wheeler 30 pi / sqrt(er) * b / (w + 0.441 b) for wide thin strips', () => {
    for (const wb of [0.5, 0.829, 1.2, 2]) {
      const wheeler = (30 * Math.PI) / Math.sqrt(2.2) / (wb + 0.441)
      expect(Math.abs(striplineThin(wb, 1, 2.2) - wheeler) / wheeler).toBeLessThan(0.006)
    }
  })
  it('w/b = 0.829 in er = 2.2 gives 50 ohm', () => {
    expect(striplineThin(0.829, 1, 2.2)).toBeGreaterThan(49.3)
    expect(striplineThin(0.829, 1, 2.2)).toBeLessThan(50.7)
  })
  it('scales as 1 / sqrt(er)', () => {
    expect(striplineThin(0.5, 1, 1) / striplineThin(0.5, 1, 4)).toBeCloseTo(2, 10)
  })
  it('fringing term tends to 2 ln2 / pi for thin strips', () => {
    expect(striplineFringe(0)).toBeCloseTo((2 * Math.LN2) / Math.PI, 12)
  })
  // Reference values from an independent finite-difference solution of Laplace's equation
  // (air stripline, b = 1, grid 0.005, converged to 3 digits).
  it.each([
    [0.6, 0.1, 75.6],
    [0.6, 0.2, 65.35],
    [0.3, 0.1, 103.8],
    [0.5, 0.3, 62.1],
    [1.5, 0.1, 41.9],
  ])('w/b = %f, t/b = %f gives %f ohm within 1%%', (w, t, ref) => {
    expect(Math.abs(stripline(w, 1, t, 1) - ref) / ref).toBeLessThan(0.01)
  })
  it('narrow thick strips stay within 3% of the numerical reference', () => {
    expect(Math.abs(stripline(0.1, 1, 0.1, 1) - 142.5) / 142.5).toBeLessThan(0.03)
    expect(Math.abs(stripline(0.2, 1, 0.05, 1) - 132.2) / 132.2).toBeLessThan(0.03)
  })
  it('thickness lowers the impedance', () => {
    expect(stripline(0.5, 1, 0.1, 4)).toBeLessThan(stripline(0.5, 1, 0.01, 4))
  })
})
