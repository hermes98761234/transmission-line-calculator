import { describe, expect, it } from 'vitest'
import { defaultState, DEFAULT_GEO, fmtLen, num, parseState, switchType, toInput, unitFactor } from './state.ts'

describe('state', () => {
  it('falls back to defaults on garbage', () => {
    expect(parseState('not json')).toEqual(defaultState())
    expect(parseState(null)).toEqual(defaultState())
  })
  it('keeps valid stored values and drops invalid ones', () => {
    const s = parseState(JSON.stringify({ type: 'cpw', freq: 5, er: 0.2, geo: { w: -1, h: 0.8 }, settings: { unit: 'mil', theme: 'dark', lang: 'uk' } }))
    expect(s.type).toBe('cpw')
    expect(s.freq).toBe(5)
    expect(s.er).toBe(defaultState().er)
    expect(s.geo.w).toBe(DEFAULT_GEO.cpw.w)
    expect(s.geo.h).toBe(0.8)
    expect(s.settings).toEqual({ unit: 'mil', theme: 'dark', lang: 'uk' })
  })
  it('switching type resets geometry and keeps the copper weight', () => {
    const s = { ...defaultState(), copper: '2oz' }
    const c = switchType(s, 'coupled')
    expect(c.geo.s).toBe(DEFAULT_GEO.coupled.s)
    expect(c.geo.t).toBeCloseTo(0.0696)
    expect(switchType(s, 'coax').geo.t).toBe(0)
  })
  it('converts to the library input in mm', () => {
    const i = toInput(defaultState())
    expect(i.type).toBe('microstrip')
    expect(i.er).toBe(4.3)
  })
  it('formats lengths', () => {
    expect(unitFactor('mil')).toBeCloseTo(39.37, 2)
    expect(fmtLen(1.6, 'mm')).toBe('1.6 mm')
    expect(fmtLen(1.6, 'mil')).toBe('62.99 mil')
    expect(num(0.000123456, 3)).toBe('0.000123')
  })
})
