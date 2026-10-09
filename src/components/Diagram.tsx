import type { LineType } from '../lib/analyze.ts'
import type { Geometry, Unit } from '../state.ts'
import { fmtLen } from '../state.ts'

interface Props {
  type: LineType
  geo: Geometry
  er: number
  unit: Unit
  ariaLabel: string
}

const W = 480
const H = 250
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Horizontal dimension line between x1 and x2 at y with the label above. */
function HDim({ x1, x2, y, text, align = 'middle' }: { x1: number; x2: number; y: number; text: string; align?: 'start' | 'middle' | 'end' }) {
  return (
    <g className="dim">
      <line x1={x1} x2={x2} y1={y} y2={y} />
      <line x1={x1} x2={x1} y1={y - 4} y2={y + 4} />
      <line x1={x2} x2={x2} y1={y - 4} y2={y + 4} />
      <text x={align === 'start' ? x1 : align === 'end' ? x2 : (x1 + x2) / 2} y={y - 5} textAnchor={align}>
        {text}
      </text>
    </g>
  )
}

function VDim({ x, y1, y2, text, side = 'right' }: { x: number; y1: number; y2: number; text: string; side?: 'left' | 'right' }) {
  return (
    <g className="dim">
      <line x1={x} x2={x} y1={y1} y2={y2} />
      <line x1={x - 4} x2={x + 4} y1={y1} y2={y1} />
      <line x1={x - 4} x2={x + 4} y1={y2} y2={y2} />
      <text x={side === 'right' ? x + 7 : x - 7} y={(y1 + y2) / 2 + 4} textAnchor={side === 'right' ? 'start' : 'end'}>
        {text}
      </text>
    </g>
  )
}

/** Live cross-section of the line, drawn to scale (heights are floored so thin copper stays visible). */
export default function Diagram({ type, geo, er, unit, ariaLabel }: Props) {
  const L = (mm: number) => fmtLen(mm, unit, 3)
  const body = (() => {
    if (type === 'coax') {
      const R = 92
      const r = clamp((geo.w / geo.h) * R, 3, R - 6)
      const cx = 170
      const cy = 125
      return (
        <>
          <circle cx={cx} cy={cy} r={R + 8} className="metal" />
          <circle cx={cx} cy={cy} r={R} className="diel" />
          <circle cx={cx} cy={cy} r={r} className="metal" />
          <text x={cx} y={cy + R * 0.62} textAnchor="middle" className="diel-text">
            εr = {er}
          </text>
          <g className="dim">
            <line x1={cx - r} x2={cx + r} y1={cy} y2={cy} />
            <text x={310} y={110}>
              d = {L(geo.w)}
            </text>
            <text x={310} y={138}>
              D = {L(geo.h)}
            </text>
            <line x1={cx - R * 0.82} x2={cx + R * 0.82} y1={cy + R * 0.57} y2={cy - R * 0.57} className="dim-guide" />
          </g>
        </>
      )
    }

    const x0 = 40
    const x1 = 400
    const cx = (x0 + x1) / 2
    const sc = (() => {
      switch (type) {
        case 'coupled':
          return 360 / (2 * geo.w + geo.s + 3 * geo.h)
        case 'cpw':
        case 'cpwg':
          return 360 / ((geo.w + 2 * geo.s) * 2.4)
        case 'stripline':
          return 360 / (geo.w + 2 * geo.h)
        default:
          return 360 / (geo.w + 3 * geo.h)
      }
    })()
    const hPx = clamp(geo.h * sc, 34, type === 'stripline' ? 130 : 100)
    const tPx = clamp(geo.t * sc, 3, 14)
    const planeH = 8

    if (type === 'stripline') {
      const top = 70
      const wPx = clamp(geo.w * sc, 8, 340)
      const mid = top + hPx / 2
      return (
        <>
          <rect x={x0} y={top - planeH} width={x1 - x0} height={planeH} className="metal" />
          <rect x={x0} y={top} width={x1 - x0} height={hPx} className="diel" />
          <rect x={x0} y={top + hPx} width={x1 - x0} height={planeH} className="metal" />
          <rect x={cx - wPx / 2} y={mid - tPx / 2} width={wPx} height={tPx} className="metal" />
          <text x={x0 + 10} y={top + 18} className="diel-text">
            εr = {er}
          </text>
          <HDim x1={cx - wPx / 2} x2={cx + wPx / 2} y={mid - tPx / 2 - 12} text={`w = ${L(geo.w)}`} />
          <VDim x={x1 + 10} y1={top} y2={top + hPx} text={`h = ${L(geo.h)}`} side="right" />
          <text x={cx + wPx / 2 + 8} y={mid + 4} className="dim-text">
            t = {L(geo.t)}
          </text>
        </>
      )
    }

    const yb = 186 // substrate bottom
    const ySub = yb - hPx
    const bottomPlane = type === 'microstrip' || type === 'coupled' || type === 'cpwg'
    const substrate = (
      <>
        <rect x={x0} y={ySub} width={x1 - x0} height={hPx} className="diel" />
        {bottomPlane ? <rect x={x0} y={yb} width={x1 - x0} height={planeH} className="metal" /> : null}
        <text x={x0 + 10} y={ySub + 20} className="diel-text">
          εr = {er}
        </text>
      </>
    )

    if (type === 'microstrip') {
      const wPx = clamp(geo.w * sc, 8, 380)
      return (
        <>
          {substrate}
          <rect x={cx - wPx / 2} y={ySub - tPx} width={wPx} height={tPx} className="metal" />
          <HDim x1={cx - wPx / 2} x2={cx + wPx / 2} y={ySub - tPx - 14} text={`w = ${L(geo.w)}`} />
          <VDim x={x1 + 10} y1={ySub} y2={yb} text={`h = ${L(geo.h)}`} side="right" />
          <text x={cx + wPx / 2 + 8} y={ySub - 2} className="dim-text">
            t = {L(geo.t)}
          </text>
        </>
      )
    }

    if (type === 'coupled') {
      const wPx = clamp(geo.w * sc, 8, 160)
      const sPx = clamp(geo.s * sc, 6, 120)
      const xa = cx - sPx / 2 - wPx
      const xb = cx + sPx / 2
      return (
        <>
          {substrate}
          <rect x={xa} y={ySub - tPx} width={wPx} height={tPx} className="metal" />
          <rect x={xb} y={ySub - tPx} width={wPx} height={tPx} className="metal" />
          <HDim x1={xa} x2={xa + wPx} y={ySub - tPx - 14} text={`w = ${L(geo.w)}`} align="end" />
          <HDim x1={cx - sPx / 2} x2={cx + sPx / 2} y={ySub - tPx - 42} text={`s = ${L(geo.s)}`} />
          <line x1={cx - sPx / 2} x2={cx - sPx / 2} y1={ySub - tPx - 42} y2={ySub - tPx} className="dim-guide" />
          <line x1={cx + sPx / 2} x2={cx + sPx / 2} y1={ySub - tPx - 42} y2={ySub - tPx} className="dim-guide" />
          <VDim x={x1 + 10} y1={ySub} y2={yb} text={`h = ${L(geo.h)}`} side="right" />
        </>
      )
    }

    // CPW / CPW with ground
    const gap = clamp(geo.s * sc, 6, 90)
    const wPx = clamp(geo.w * sc, 8, 200)
    const left = cx - wPx / 2
    const right = cx + wPx / 2
    return (
      <>
        {substrate}
        <rect x={left} y={ySub - tPx} width={wPx} height={tPx} className="metal" />
        <rect x={x0} y={ySub - tPx} width={Math.max(left - gap - x0, 4)} height={tPx} className="metal" />
        <rect x={right + gap} y={ySub - tPx} width={Math.max(x1 - right - gap, 4)} height={tPx} className="metal" />
        <HDim x1={left} x2={right} y={ySub - tPx - 14} text={`w = ${L(geo.w)}`} align="end" />
        <HDim x1={right} x2={right + gap} y={ySub - tPx - 42} text={`s = ${L(geo.s)}`} />
        <line x1={right} x2={right} y1={ySub - tPx - 42} y2={ySub - tPx} className="dim-guide" />
        <line x1={right + gap} x2={right + gap} y1={ySub - tPx - 42} y2={ySub - tPx} className="dim-guide" />
        <VDim x={x1 + 10} y1={ySub} y2={yb} text={`h = ${L(geo.h)}`} side="right" />
      </>
    )
  })()

  return (
    <svg className="diagram" viewBox={`0 12 ${W} ${H - 24}`} role="img" aria-label={ariaLabel}>
      {body}
    </svg>
  )
}
