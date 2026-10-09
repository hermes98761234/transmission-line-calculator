export interface Substrate {
  id: string
  name: string
  er: number
  tand: number
}

/** Typical datasheet values near 10 GHz. */
export const SUBSTRATES: Substrate[] = [
  { id: 'fr4', name: 'FR-4', er: 4.3, tand: 0.02 },
  { id: 'ro4003c', name: 'Rogers RO4003C', er: 3.38, tand: 0.0027 },
  { id: 'ro4350b', name: 'Rogers RO4350B', er: 3.48, tand: 0.0037 },
  { id: 'ro3003', name: 'Rogers RO3003', er: 3.0, tand: 0.001 },
  { id: 'alumina', name: 'Alumina 99.6%', er: 9.8, tand: 0.0001 },
  { id: 'ptfe', name: 'PTFE (Teflon)', er: 2.1, tand: 0.0002 },
]

export interface Copper {
  id: string
  name: string
  /** Foil thickness in mm. */
  t: number
}

/** Copper foil by weight (1 oz/ft^2 = 34.8 um). */
export const COPPERS: Copper[] = [
  { id: '0.5oz', name: '0.5 oz', t: 0.0174 },
  { id: '1oz', name: '1 oz', t: 0.0348 },
  { id: '2oz', name: '2 oz', t: 0.0696 },
  { id: '3oz', name: '3 oz', t: 0.1044 },
]

export const findSubstrate = (id: string) => SUBSTRATES.find((s) => s.id === id)
export const findCopper = (id: string) => COPPERS.find((c) => c.id === id)

export const MM_PER_MIL = 0.0254
