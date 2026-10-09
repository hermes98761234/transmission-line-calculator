/** Coaxial line: inner conductor diameter d, outer (shield inner) diameter D. */
export function coaxZ0(d: number, D: number, er: number): number {
  return (60 / Math.sqrt(er)) * Math.log(D / d)
}
