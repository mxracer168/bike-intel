// Matching a demo product to a store's search results by name. Strict on
// purpose: every distinguishing word of our product name (model names and
// numbers) must appear in the result's title, the brand must appear in the
// title or vendor, and among those the closest title wins. A miss is better
// than a wrong product; the review page shows every match for a human check.

const STOP = new Set(['the', 'and', 'for', 'with', 'a', 'of', 'in'])
/** Category words a store's title may leave out ("Maxxis Minion DHF 29x2.5" is a tire). */
const GENERIC = new Set(['tire', 'tires', 'tyre', 'tyres', 'tube', 'tubes', 'inner', 'chain', 'chains', 'cassette', 'pads', 'pad',
  'brake', 'disc', 'rotor', 'grips', 'grip', 'lock', 'on', 'tape', 'bar', 'cable', 'kit', 'cleaner', 'lube', 'bike', 'bicycle',
  'light', 'front', 'rear', 'helmet', 'bottle', 'cage', 'pump', 'tool', 'levers', 'sealant', 'pedals', 'saddle', 'mountain', 'road'])

export const normalize = (s) => s.toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
export const tokens = (s) => normalize(s).split(' ').filter((t) => t && !STOP.has(t))

/** The words a result must contain to be this product. */
export function requiredWords(name, brand) {
  const brandWords = new Set(tokens(brand))
  const own = tokens(name).filter((t) => !brandWords.has(t))
  const specific = own.filter((t) => !GENERIC.has(t))
  return specific.length ? specific : own
}

/**
 * The best result for a product, or null. A result is { title, vendor?, url, image }.
 * Score: all required words present (else rejected), brand present, then the
 * fewest extra words (a "Minion DHF" beats a "Minion DHF / DHR II combo").
 */
export function bestMatch(product, results) {
  const need = requiredWords(product.name, product.brand)
  const brand = normalize(product.brand)
  const wanted = new Set(tokens(product.name))
  let best = null
  for (const r of results) {
    if (!r?.title || !r.image) continue
    const title = ` ${normalize(r.title)} `
    const words = new Set(tokens(r.title))
    if (!need.every((w) => words.has(w))) continue
    if (!title.includes(` ${brand} `) && normalize(r.vendor ?? '') !== brand) continue
    const extra = [...words].filter((w) => !wanted.has(w) && !/^\d/.test(w)).length
    const score = 100 - extra
    if (!best || score > best.score) best = { ...r, score }
  }
  return best
}
