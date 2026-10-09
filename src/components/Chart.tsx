import { useId, useState } from 'react'
import { num } from '../state.ts'

export interface ChartSeries {
  label: string
  color: string
  y: number[]
}

interface Props {
  x: number[]
  series: ChartSeries[]
  xLabel: string
  yLabel: string
  title: string
  /** Operating point marker. */
  marker?: { x: number; y: number }
  ariaLabel: string
  /** Force the y axis to include zero. */
  zero?: boolean
}

const W = 480
const H = 250
const M = { l: 46, r: 12, t: 12, b: 38 }

function niceTicks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo || 1
  const raw = span / n
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12))
  return out
}

function logTicks(lo: number, hi: number): number[] {
  const out: number[] = []
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * Math.pow(10, e)
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v)
    }
  }
  return out
}

/** Small dependency-free line chart with a logarithmic x axis and a pointer read-out. */
export default function Chart({ x, series, xLabel, yLabel, title, marker, ariaLabel, zero }: Props) {
  const clipId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const xs = x.map((v) => Math.log10(v))
  const x0 = xs[0]
  const x1 = xs[xs.length - 1]
  const all = series.flatMap((s) => s.y).filter(Number.isFinite)
  let yMin = zero ? Math.min(0, ...all) : Math.min(...all)
  let yMax = Math.max(...all)
  if (marker) yMax = Math.max(yMax, marker.y)
  if (yMax <= yMin) yMax = yMin + 1
  const yt = niceTicks(yMin, yMax)
  yMax = Math.max(yMax, yt[yt.length - 1])
  yMin = Math.min(yMin, yt[0])
  const px = (lx: number) => M.l + ((lx - x0) / (x1 - x0)) * (W - M.l - M.r)
  const py = (v: number) => H - M.b - ((v - yMin) / (yMax - yMin)) * (H - M.t - M.b)
  const path = (ys: number[]) => ys.map((v, i) => `${i ? 'L' : 'M'}${px(xs[i]).toFixed(1)},${py(v).toFixed(1)}`).join('')
  const xt = logTicks(x[0], x[x.length - 1])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * W
    const lx = x0 + ((sx - M.l) / (W - M.l - M.r)) * (x1 - x0)
    let best = 0
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - lx) < Math.abs(xs[best] - lx)) best = i
    setHover(sx < M.l || sx > W - M.r ? null : best)
  }

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <clipPath id={clipId}>
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
        </clipPath>
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className="plot-bg" />
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={M.l} x2={W - M.r} y1={py(v)} y2={py(v)} className="grid" />
            <text x={M.l - 6} y={py(v) + 4} textAnchor="end" className="tick">
              {num(v, 3)}
            </text>
          </g>
        ))}
        {xt.map((v) => (
          <g key={`x${v}`}>
            <line x1={px(Math.log10(v))} x2={px(Math.log10(v))} y1={M.t} y2={H - M.b} className="grid" />
            <text x={px(Math.log10(v))} y={H - M.b + 14} textAnchor="middle" className="tick">
              {num(v, 3)}
            </text>
          </g>
        ))}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className="plot-frame" />
        <g clipPath={`url(#${clipId})`}>
          {series.map((s) => (
            <path key={s.label} d={path(s.y)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {marker && Number.isFinite(marker.y) && marker.x >= x[0] && marker.x <= x[x.length - 1] ? (
            <g>
              <line x1={px(Math.log10(marker.x))} x2={px(Math.log10(marker.x))} y1={M.t} y2={H - M.b} className="marker-line" />
              <circle cx={px(Math.log10(marker.x))} cy={py(marker.y)} r={4.5} className="marker" />
            </g>
          ) : null}
          {hover !== null ? <line x1={px(xs[hover])} x2={px(xs[hover])} y1={M.t} y2={H - M.b} className="hover-line" /> : null}
        </g>
        <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle" className="axis">
          {xLabel}
        </text>
        <text transform={`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" className="axis">
          {yLabel}
        </text>
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
            {hover !== null ? <b> {num(s.y[hover], 4)}</b> : null}
          </span>
        ))}
        {hover !== null ? (
          <span className="at">
            {xLabel.split(' (')[0]} = {num(x[hover], 4)}
          </span>
        ) : null}
      </div>
    </figure>
  )
}
