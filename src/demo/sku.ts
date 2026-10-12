/**
 * EXAMPLE supplier item numbers (SKUs). Each supplier numbers its own items
 * in its own format; the same supplier, product and option always get the
 * same number, so an order line and the Catalog's offer agree. Invented for
 * the example data only.
 */
const FORMATS: Record<string, (n: number) => string> = {
  'Northline Distribution': (n) => `NL-${String(n % 1_000_000).padStart(6, '0')}`,
  'Summit Parts Supply': (n) => `SPS ${String(n % 100_000).padStart(5, '0')}`,
  'Cascade Components': (n) => `CC${String(n % 10_000_000).padStart(7, '0')}`,
  'Trek Bicycle': (n) => `TRK-${String(n % 1_000_000).padStart(6, '0')}`,
}

function hash(s: string): number {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  return h
}

export function demoSku(supplier: string, product: string, variant?: string): string {
  const n = hash(`${supplier}|${product}|${variant ?? ''}`)
  return (FORMATS[supplier] ?? ((x: number) => `${supplier.slice(0, 3).toUpperCase()}-${x % 1_000_000}`))(n)
}
