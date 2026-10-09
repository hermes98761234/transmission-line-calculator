import { useId, useState } from 'react'
import { num } from '../state.ts'

interface Props {
  label: string
  /** Value in internal units. */
  value: number
  onChange: (v: number) => void
  /** Display = internal * factor. */
  factor?: number
  unit?: string
  allowZero?: boolean
  disabled?: boolean
  invalid?: boolean
  step?: number
}

export default function NumberField({ label, value, onChange, factor = 1, unit, allowZero, disabled, invalid, step }: Props) {
  const id = useId()
  // While the user is typing we show their raw text; otherwise the formatted value.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? num(value * factor, 5)
  const valid = (v: number) => Number.isFinite(v) && (allowZero ? v >= 0 : v > 0)
  const parsed = parseFloat(text.replace(',', '.'))
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {unit ? <span className="unit"> ({unit})</span> : null}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step ?? 'any'}
        value={text}
        disabled={disabled}
        className={!disabled && (!valid(parsed) || invalid) ? 'bad' : undefined}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value)
          const v = parseFloat(e.target.value.replace(',', '.'))
          if (valid(v)) onChange(v / factor)
        }}
      />
    </div>
  )
}
