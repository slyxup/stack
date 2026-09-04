/** Date -> ISO string (SDK contract) */
export function isoOrNull(d: Date | null | undefined): string | null {
  return d instanceof Date && !Number.isNaN(d.getTime())
    ? d.toISOString()
    : null;
}
