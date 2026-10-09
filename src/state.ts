import { type Input, type LineType, LINE_TYPES } from './lib/analyze.ts'
import { COPPERS, findCopper, findSubstrate, MM_PER_MIL, SUBSTRATES } from './lib/materials.ts'
import { SIGMA_CU } from './lib/constants.ts'

export type Lang = 'en' | 'uk'
export type Theme = 'auto' | 'light' | 'dark'
export type Unit = 'mm' | 'mil'
export type Mode = 'analyze' | 'synth'

export interface Settings {
  lang: Lang
  theme: Theme
  unit: Unit
}

export interface Geometry {
  w: number
  h: number
  t: number
  s: number
}

export interface AppState {
  settings: Settings
  type: LineType
  mode: Mode
  substrate: string
  copper: string
  geo: Geometry
  er: number
  tand: number
  /** GHz */
  freq: number
  /** um RMS */
  rough: number
  /** Target impedance for synthesis (coupled: differential), ohm. */
  target: number
}

const KEY = 'transmission-line-calculator:v1'

/** Sensible starting geometry (mm) for each line type. */
export const DEFAULT_GEO: Record<LineType, Geometry> = {
  microstrip: { w: 3.0, h: 1.6, t: 0.0348, s: 0.2 },
  stripline: { w: 0.5, h: 1.0, t: 0.0348, s: 0.2 },
  cpw: { w: 1.0, h: 1.6, t: 0.0348, s: 0.3 },
  cpwg: { w: 1.0, h: 1.6, t: 0.0348, s: 0.3 },
  coupled: { w: 1.0, h: 1.6, t: 0.0348, s: 0.4 },
  coax: { w: 0.91, h: 3.0, t: 0, s: 0 },
}

export const DEFAULT_TARGET: Record<LineType, number> = {
  microstrip: 50,
  stripline: 50,
  cpw: 50,
  cpwg: 50,
  coupled: 100,
  coax: 50,
}

export function defaultState(): AppState {
  const sub = SUBSTRATES[0]
  return {
    settings: { lang: 'en', theme: 'auto', unit: 'mm' },
    type: 'microstrip',
    mode: 'analyze',
    substrate: sub.id,
    copper: '1oz',
    geo: { ...DEFAULT_GEO.microstrip },
    er: sub.er,
    tand: sub.tand,
    freq: 1,
    rough: 0.5,
    target: 50,
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Merge stored JSON over the defaults, dropping anything with the wrong type. */
export function parseState(raw: string | null): AppState {
  const d = defaultState()
  if (!raw) return d
  try {
    const o = JSON.parse(raw) as Partial<AppState> & { settings?: Partial<Settings>; geo?: Partial<Geometry> }
    const st: Partial<Settings> = o.settings ?? {}
    const geo: Partial<Geometry> = o.geo ?? {}
    const type = LINE_TYPES.includes(o.type as LineType) ? (o.type as LineType) : d.type
    const g = DEFAULT_GEO[type]
    return {
      settings: {
        lang: st.lang === 'uk' ? 'uk' : st.lang === 'en' ? 'en' : defaultLang(),
        theme: st.theme === 'light' || st.theme === 'dark' ? st.theme : 'auto',
        unit: st.unit === 'mil' ? 'mil' : 'mm',
      },
      type,
      mode: o.mode === 'synth' ? 'synth' : 'analyze',
      substrate: typeof o.substrate === 'string' && (o.substrate === 'custom' || findSubstrate(o.substrate)) ? o.substrate : d.substrate,
      copper: typeof o.copper === 'string' && (o.copper === 'custom' || findCopper(o.copper)) ? o.copper : d.copper,
      geo: {
        w: isNum(geo.w) && geo.w > 0 ? geo.w : g.w,
        h: isNum(geo.h) && geo.h > 0 ? geo.h : g.h,
        t: isNum(geo.t) && geo.t >= 0 ? geo.t : g.t,
        s: isNum(geo.s) && geo.s > 0 ? geo.s : g.s,
      },
      er: isNum(o.er) && o.er >= 1 ? o.er : d.er,
      tand: isNum(o.tand) && o.tand >= 0 ? o.tand : d.tand,
      freq: isNum(o.freq) && o.freq > 0 ? o.freq : d.freq,
      rough: isNum(o.rough) && o.rough >= 0 ? o.rough : d.rough,
      target: isNum(o.target) && o.target > 0 ? o.target : DEFAULT_TARGET[type],
    }
  } catch {
    return d
  }
}

function defaultLang(): Lang {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('uk') ? 'uk' : 'en'
}

export function loadState(): AppState {
  try {
    const s = parseState(localStorage.getItem(KEY))
    if (!localStorage.getItem(KEY)) s.settings.lang = defaultLang()
    return s
  } catch {
    return defaultState()
  }
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

export function toInput(s: AppState, geo: Geometry = s.geo): Input {
  return { type: s.type, ...geo, er: s.er, tand: s.tand, freq: s.freq, sigma: SIGMA_CU, rough: s.rough }
}

/** Switch line type: geometry and target reset to that type's defaults, copper weight kept. */
export function switchType(s: AppState, type: LineType): AppState {
  const geo = { ...DEFAULT_GEO[type] }
  const cu = findCopper(s.copper)
  if (type !== 'coax') geo.t = cu ? cu.t : s.geo.t || geo.t
  return { ...s, type, geo, target: DEFAULT_TARGET[type] }
}

/** Display factor: internal mm -> unit. */
export const unitFactor = (u: Unit) => (u === 'mil' ? 1 / MM_PER_MIL : 1)

/** Format a number with up to `digits` significant digits and no trailing zeros. */
export function num(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return '-'
  if (v === 0) return '0'
  return String(+v.toPrecision(digits))
}

export const fmtLen = (mm: number, u: Unit, digits = 4) => `${num(mm * unitFactor(u), digits)} ${u}`

export { COPPERS }
