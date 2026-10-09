import { describe, expect, it } from 'vitest'
import { agm, ellipK, kRatio } from './elliptic.ts'

describe('elliptic integrals', () => {
  it('agm(1, sqrt 2/2) matches Gauss constant relation', () => {
    expect(agm(1, Math.SQRT1_2)).toBeCloseTo(0.8472130848, 9)
  })
  it('K(0) = pi/2', () => {
    expect(ellipK(0)).toBeCloseTo(Math.PI / 2, 12)
  })
  it('K(1/sqrt2) = 1.8540746773 (Abramowitz & Stegun table)', () => {
    expect(ellipK(Math.SQRT1_2)).toBeCloseTo(1.8540746773, 9)
  })
  it('K(0.5) = 1.6857503548', () => {
    expect(ellipK(0.5)).toBeCloseTo(1.6857503548, 9)
  })
  it("K'/K is 1 at k = 1/sqrt2 and inverts under k <-> k'", () => {
    expect(kRatio(Math.SQRT1_2)).toBeCloseTo(1, 12)
    const k = 0.3
    expect(kRatio(k) * kRatio(Math.sqrt(1 - k * k))).toBeCloseTo(1, 12)
  })
})
