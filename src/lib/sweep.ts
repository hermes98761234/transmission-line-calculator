import { analyze, type Input, type ModeId, targetImpedance } from './analyze.ts'

export interface Series {
  id: ModeId | 'diff' | 'cond' | 'diel' | 'total'
  y: number[]
}

export interface Sweep {
  x: number[]
  series: Series[]
}

const logSpace = (a: number, b: number, n: number) =>
  Array.from({ length: n }, (_, i) => a * Math.pow(b / a, i / (n - 1)))

/** Static impedance versus trace width (mm), other parameters fixed. Coupled lines plot Z0e, Z0o and the differential impedance. */
export function impedanceVsWidth(inp: Input, n = 60): Sweep {
  const ref = inp.type === 'coax' ? inp.h : inp.w
  const lo = inp.type === 'coax' ? Math.max(ref * 0.02, 1e-6) : ref / 6
  const hi = inp.type === 'coax' ? ref * 0.95 : ref * 6
  const x = logSpace(lo, hi, n)
  const series: Series[] =
    inp.type === 'coupled'
      ? [
          { id: 'even', y: [] },
          { id: 'odd', y: [] },
          { id: 'diff', y: [] },
        ]
      : [{ id: 'single', y: [] }]
  for (const w of x) {
    const a = analyze({ ...inp, w, freq: 1e-3 })
    if (inp.type === 'coupled') {
      series[0].y.push(a.modes[0].z0)
      series[1].y.push(a.modes[1].z0)
      series[2].y.push(2 * a.modes[1].z0)
    } else series[0].y.push(targetImpedance({ ...inp, w }))
  }
  return { x, series }
}

/** Conductor, dielectric and total attenuation (dB/m) versus frequency (GHz). For coupled lines the odd mode is shown. */
export function lossVsFrequency(inp: Input, fMin = 0.1, fMax = 40, n = 60): Sweep {
  const x = logSpace(fMin, fMax, n)
  const series: Series[] = [
    { id: 'cond', y: [] },
    { id: 'diel', y: [] },
    { id: 'total', y: [] },
  ]
  for (const f of x) {
    const a = analyze({ ...inp, freq: f })
    const m = a.modes[a.modes.length - 1]
    series[0].y.push(m.alphaC)
    series[1].y.push(m.alphaD)
    series[2].y.push(m.alphaT)
  }
  return { x, series }
}
