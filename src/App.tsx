import { useEffect, useState } from 'react'
import { analyze, LINE_TYPES, synthesize, targetImpedance, validate, type Analysis, type LineType } from './lib/analyze.ts'
import { COPPERS, findCopper, findSubstrate, SUBSTRATES } from './lib/materials.ts'
import { impedanceVsWidth, lossVsFrequency } from './lib/sweep.ts'
import { LINE_NAME, N, tr, type T } from './i18n.ts'
import {
  fmtLen,
  loadState,
  num,
  saveState,
  switchType,
  toInput,
  unitFactor,
  type AppState,
  type Geometry,
  type Mode,
  type Settings,
} from './state.ts'
import NumberField from './components/NumberField.tsx'
import Diagram from './components/Diagram.tsx'
import Chart from './components/Chart.tsx'

const FIELD_LABEL: Record<LineType, Partial<Record<keyof Geometry, string>>> = {
  microstrip: { w: N('Trace width'), h: N('Substrate height'), t: N('Copper thickness') },
  stripline: { w: N('Trace width'), h: N('Ground plane spacing'), t: N('Copper thickness') },
  cpw: { w: N('Centre conductor width'), s: N('Gap to ground'), h: N('Substrate height'), t: N('Copper thickness') },
  cpwg: { w: N('Centre conductor width'), s: N('Gap to ground'), h: N('Substrate height'), t: N('Copper thickness') },
  coupled: { w: N('Trace width'), s: N('Spacing between traces'), h: N('Substrate height'), t: N('Copper thickness') },
  coax: { w: N('Inner conductor diameter'), h: N('Outer conductor inner diameter') },
}

const FIELD_ORDER: (keyof Geometry)[] = ['w', 's', 'h', 't']

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const { settings } = state
  const t: T = (s, ...a) => tr(settings.lang, s, ...a)
  const update = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }))
  const setSettings = (patch: Partial<Settings>) => update({ settings: { ...settings, ...patch } })

  useEffect(() => saveState(state), [state])
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = settings.theme
    root.lang = settings.lang
  }, [settings.theme, settings.lang])

  const { type, mode } = state
  const k = unitFactor(settings.unit)
  const labels = FIELD_LABEL[type]
  const isCoax = type === 'coax'
  const synthMode = mode === 'synth'

  const baseInput = toInput(state)
  // In Synthesize the width is the unknown: validate the rest with a placeholder width.
  const probe = synthMode ? { ...baseInput, w: isCoax ? baseInput.h / 10 : 1 } : baseInput
  const synth = synthMode && validate(probe).size === 0 ? synthesize(baseInput, state.target) : null
  const geo: Geometry = synthMode && synth?.ok ? { ...state.geo, w: synth.w } : state.geo
  const input = toInput(state, geo)
  const bad = synthMode ? validate(probe) : validate(input)
  const ready = bad.size === 0 && (!synthMode || synth?.ok === true)

  const analysis: Analysis | null = ready ? analyze(input) : null
  const zSweep = ready ? impedanceVsWidth(input) : null
  const lSweep = ready ? lossVsFrequency(input) : null
  const zStatic = ready ? targetImpedance(input) : NaN

  const setGeo = (patch: Partial<Geometry>) => update({ geo: { ...state.geo, ...patch } })
  const setSubstrate = (id: string) => {
    const sub = findSubstrate(id)
    update(sub ? { substrate: id, er: sub.er, tand: sub.tand } : { substrate: 'custom' })
  }
  const setCopper = (id: string) => {
    const cu = findCopper(id)
    update(cu ? { copper: id, geo: { ...state.geo, t: cu.t } } : { copper: 'custom' })
  }

  const unitLabel = settings.unit
  const lossK = settings.unit === 'mil' ? 0.0254 : 1
  const lossUnit = settings.unit === 'mil' ? 'dB/in' : 'dB/m'
  const delayK = settings.unit === 'mil' ? 25.4 : 1
  const delayUnit = settings.unit === 'mil' ? 'ps/in' : 'ps/mm'

  const geoField = (key: keyof Geometry) => {
    const label = labels[key]
    if (!label) return null
    const solved = synthMode && key === 'w'
    return (
      <NumberField
        key={key}
        label={t(label)}
        unit={unitLabel}
        value={solved && synth?.ok ? synth.w : state.geo[key]}
        factor={k}
        allowZero={key === 't'}
        disabled={solved}
        invalid={bad.has(key)}
        onChange={(v) => (key === 't' ? update({ geo: { ...state.geo, t: v }, copper: 'custom' }) : setGeo({ [key]: v }))}
      />
    )
  }

  const modes = analysis?.modes ?? []
  const multi = modes.length > 1
  const modeName = (id: string) => (id === 'even' ? t('Even') : id === 'odd' ? t('Odd') : t('Single'))
  const row = (label: string, cells: string[]) => (
    <tr key={label}>
      <td>{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="num">
          {c}
        </td>
      ))}
    </tr>
  )

  const ohm = (v: number) => `${num(v, 4)} Ω`
  const xs = zSweep ? zSweep.x.map((v) => v * k) : []
  const targetLabel = type === 'coupled' ? N('Target differential impedance') : N('Target impedance')

  return (
    <div className="app">
      <header className="toolbar">
        <div className="titles">
          <h1 className="brand">{t('Transmission line calculator')}</h1>
          <span className="hint">{t('Impedance, delay and loss of microstrip, stripline, CPW and coax.')}</span>
        </div>
        <div className="settings" role="group" aria-label={t('Settings')}>
          <label>
            {t('Units')}
            <select value={settings.unit} onChange={(e) => setSettings({ unit: e.target.value as Settings['unit'] })}>
              <option value="mm">mm</option>
              <option value="mil">mil</option>
            </select>
          </label>
          <label>
            {t('Language')}
            <select value={settings.lang} onChange={(e) => setSettings({ lang: e.target.value as Settings['lang'] })}>
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </label>
          <label>
            {t('Theme')}
            <select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value as Settings['theme'] })}>
              <option value="auto">{t('System')}</option>
              <option value="light">{t('Light')}</option>
              <option value="dark">{t('Dark')}</option>
            </select>
          </label>
        </div>
      </header>
      <div className="body">
        <aside className="side">
          <div className="panel">
            <section className="section">
              <div className="field">
                <label htmlFor="line-type">{t('Line type')}</label>
                <select id="line-type" value={type} onChange={(e) => setState((s) => switchType(s, e.target.value as LineType))}>
                  {LINE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {t(LINE_NAME[lt])}
                    </option>
                  ))}
                </select>
              </div>
              <div className="seg" role="group" aria-label={t('Mode')}>
                {(['analyze', 'synth'] as Mode[]).map((m) => (
                  <button key={m} className={mode === m ? 'on' : ''} aria-pressed={mode === m} onClick={() => update({ mode: m })}>
                    {m === 'analyze' ? t('Analyze') : t('Synthesize')}
                  </button>
                ))}
              </div>
              <p className="hint">{synthMode ? t('Impedance to width') : t('Geometry to impedance')}</p>
            </section>

            {synthMode ? (
              <section className="section">
                <NumberField label={t(targetLabel)} unit="Ω" value={state.target} onChange={(v) => update({ target: v })} />
              </section>
            ) : null}

            <section className="section">
              <h3>{t('Substrate')}</h3>
              <div className="field">
                <label htmlFor="preset">{t('Preset')}</label>
                <select id="preset" value={state.substrate} onChange={(e) => setSubstrate(e.target.value)}>
                  {SUBSTRATES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (εr {s.er})
                    </option>
                  ))}
                  <option value="custom">{t('Custom')}</option>
                </select>
              </div>
              <div className="grid2">
                <NumberField label={t('Relative permittivity εr')} value={state.er} onChange={(v) => update({ er: v, substrate: 'custom' })} invalid={bad.has('er')} step={0.01} />
                <NumberField label={t('Loss tangent tan δ')} value={state.tand} allowZero onChange={(v) => update({ tand: v, substrate: 'custom' })} invalid={bad.has('tand')} step={0.0001} />
              </div>
            </section>

            <section className="section">
              <h3>{t('Geometry')}</h3>
              <div className="grid2">{FIELD_ORDER.map((key) => geoField(key))}</div>
              {synthMode ? <p className="hint">{t('Solved from the target impedance')}</p> : null}
              {!isCoax ? (
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="copper">{t('Copper weight')}</label>
                    <select id="copper" value={state.copper} onChange={(e) => setCopper(e.target.value)}>
                      {COPPERS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({num(c.t * 1000, 3)} µm)
                        </option>
                      ))}
                      <option value="custom">{t('Custom')}</option>
                    </select>
                  </div>
                  <NumberField label={t('Surface roughness (RMS)')} unit="µm" value={state.rough} allowZero onChange={(v) => update({ rough: v })} />
                </div>
              ) : null}
            </section>

            <section className="section">
              <NumberField label={t('Frequency (GHz)')} value={state.freq} onChange={(v) => update({ freq: v })} invalid={bad.has('freq')} />
            </section>
          </div>
        </aside>

        <main className="main">
          <section className="box" aria-live="polite">
            <h2>{t('Result')}</h2>
            {bad.size > 0 ? (
              <p className="verdict err">{t('Fix the highlighted fields.')}</p>
            ) : synthMode && synth && !synth.ok ? (
              <p className="verdict err">
                {synth.reason === 'high'
                  ? t('The target is too high to reach by changing the width: even the narrowest trace is lower.')
                  : t('The target is too low to reach by changing the width: even the widest trace is higher.')}
              </p>
            ) : analysis ? (
              <>
                {synthMode && synth?.ok ? (
                  <div className="hero">
                    <div>
                      <div className="hero-label">{t(isCoax ? N('Required inner conductor diameter') : N('Required trace width'))}</div>
                      <div className="hero-value">
                        {fmtLen(synth.w, settings.unit)} <small>= {fmtLen(synth.w, settings.unit === 'mm' ? 'mil' : 'mm')}</small>
                      </div>
                    </div>
                    <button onClick={() => update({ mode: 'analyze', geo: { ...state.geo, w: synth.w } })}>{t('Use this value in Analyze')}</button>
                  </div>
                ) : null}
                {synthMode && synth?.ok ? (
                  <p className="hint">{t('The width is solved for the low-frequency impedance; dispersion shifts Z0 slightly at high frequency.')}</p>
                ) : null}
                <table className="data">
                  {multi ? (
                    <thead>
                      <tr>
                        <th />
                        {modes.map((m) => (
                          <th key={m.id}>{modeName(m.id)}</th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {multi
                      ? row(t('Characteristic impedance Z0'), modes.map((m) => ohm(m.z0)))
                      : row(t('Characteristic impedance Z0'), [ohm(modes[0].z0)])}
                    {analysis.zdiff !== undefined ? row(t('Differential impedance'), [ohm(analysis.zdiff), '']) : null}
                    {analysis.zcomm !== undefined ? row(t('Common-mode impedance'), [ohm(analysis.zcomm), '']) : null}
                    {row(t('Effective permittivity εeff'), modes.map((m) => num(m.eeff, 4)))}
                    {row(t('Delay'), modes.map((m) => `${num(m.delay * delayK, 4)} ${delayUnit}`))}
                    {row(t('Wavelength'), modes.map((m) => fmtLen(m.wavelength, settings.unit)))}
                    {row(t('Conductor loss'), modes.map((m) => `${num(m.alphaC * lossK, 3)} ${lossUnit}`))}
                    {row(t('Dielectric loss'), modes.map((m) => `${num(m.alphaD * lossK, 3)} ${lossUnit}`))}
                    {row(t('Total loss'), modes.map((m) => `${num(m.alphaT * lossK, 3)} ${lossUnit}`))}
                    {row(t('Skin depth'), [`${num(analysis.skinDepth, 3)} µm`, ...(multi ? [''] : [])])}
                  </tbody>
                </table>
                {analysis.warnings.length > 0 ? (
                  <ul className="notes warn-text" aria-label={t('Notes')}>
                    {analysis.warnings.map((w) => (
                      <li key={w}>{t(w)}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </section>

          <section className="box">
            <h2>{t('Cross-section')}</h2>
            <Diagram type={type} geo={geo} er={state.er} unit={settings.unit} ariaLabel={t('Cross-section of the line, drawn to scale')} />
          </section>

          {ready && zSweep && lSweep && analysis ? (
            <div className="charts">
              <section className="box">
                <Chart
                  title={t('Impedance versus width')}
                  ariaLabel={t('Impedance Z0 versus trace width')}
                  x={xs}
                  xLabel={`${t(isCoax ? N('Diameter d') : N('Width'))} (${unitLabel})`}
                  yLabel={t('Impedance (Ω)')}
                  series={zSweep.series.map((s) => ({
                    label: s.id === 'even' ? t('Z0 even') : s.id === 'odd' ? t('Z0 odd') : s.id === 'diff' ? t('Z differential') : 'Z0',
                    color: s.id === 'odd' ? 'var(--c2)' : s.id === 'diff' ? 'var(--c3)' : 'var(--c1)',
                    y: s.y,
                  }))}
                  marker={{ x: geo.w * k, y: type === 'coupled' ? 2 * (analysis.modes[1].z0) : zStatic }}
                />
              </section>
              <section className="box">
                <Chart
                  title={t('Loss versus frequency')}
                  ariaLabel={t('Attenuation versus frequency')}
                  x={lSweep.x}
                  xLabel={t('Frequency (GHz)')}
                  yLabel={settings.unit === 'mil' ? t('Loss (dB/in)') : t('Loss (dB/m)')}
                  zero
                  series={lSweep.series.map((s) => ({
                    label: s.id === 'cond' ? t('Conductor') : s.id === 'diel' ? t('Dielectric') : t('Total'),
                    color: s.id === 'cond' ? 'var(--c2)' : s.id === 'diel' ? 'var(--c3)' : 'var(--c1)',
                    y: s.y.map((v) => v * lossK),
                  }))}
                  marker={{ x: state.freq, y: analysis.modes[analysis.modes.length - 1].alphaT * lossK }}
                />
              </section>
            </div>
          ) : null}
        </main>
      </div>
      <p className="hint foot">
        {t('Closed-form models: expect a few percent. Verify critical designs with a field solver.')}{' '}
        <a href="https://github.com/hermes98761234/transmission-line-calculator">{t('Source on GitHub')}</a>
      </p>
    </div>
  )
}
