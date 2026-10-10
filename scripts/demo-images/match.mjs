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

// ---------- Relaxed fallback (--relaxed) ----------
// Used only when no strict match exists. Same brand, same general product
// type; size, color, pack quantity and minor model differences are allowed.
// Results are recorded as approximate and labelled so on the review sheet.

/**
 * General product types, most specific first, so a "tire lever" is a tool and
 * not a tire, a "bottle cage" is not a bottle, "chain lube" is not a chain.
 * Each phrase matches whole words of a normalized title.
 */
export const TYPES = [
  ['stand', ['repair stand', 'truing stand', 'work stand', 'bike stand']],
  ['rack', ['hitch rack', 'roof rack', 'rear rack', 'front rack', 'rack']],
  ['trainer', ['trainer', 'smart trainer']],
  ['suspension fluid', ['suspension fluid', 'fork oil', 'suspension oil']],
  ['tool', ['tire lever', 'tire levers', 'tyre lever', 'tyre levers', 'chain tool', 'chain checker', 'multi tool', 'multitool', 'torque wrench', 'hex wrench', 'cassette tool', 'spoke wrench', 'tool kit']],
  ['pump', ['shock pump', 'floor pump', 'mini pump', 'frame pump', 'pump', 'inflator', 'co2']],
  ['rim tape', ['rim tape', 'rim strip', 'rim strips']],
  ['bar tape', ['bar tape', 'handlebar tape']],
  ['sealant', ['sealant']],
  ['tubeless valve', ['tubeless valve', 'tubeless valves', 'valve stem', 'valve stems']],
  ['lube', ['chain lube', 'lube', 'lubricant', 'chain oil', 'wax']],
  ['cleaner', ['bike cleaner', 'cleaner', 'degreaser', 'wash']],
  ['grease', ['grease', 'assembly paste', 'carbon paste']],
  ['brake fluid', ['brake fluid', 'mineral oil', 'dot fluid', 'bleed kit']],
  ['chain link', ['quick link', 'missing link', 'connecting pin', 'connecting pins', 'master link', 'power link']],
  ['bottle cage', ['bottle cage', 'bottle cages', 'cage']],
  ['saddle bag', ['saddle bag', 'seat bag', 'frame bag', 'handlebar bag', 'bag']],
  ['bottle', ['water bottle', 'bottle', 'bottles']],
  ['tube', ['inner tube', 'inner tubes', 'tube', 'tubes']],
  ['tire', ['tire', 'tires', 'tyre', 'tyres']],
  ['brake pads', ['brake pads', 'brake pad', 'disc pads', 'disc pad', 'pads', 'pad']],
  ['rotor', ['rotor', 'rotors', 'disc rotor']],
  ['cassette', ['cassette', 'cassettes']],
  ['chain', ['chain', 'chains']],
  ['derailleur hanger', ['derailleur hanger', 'hanger']],
  ['derailleur', ['derailleur']],
  ['freehub', ['freehub', 'freehub body', 'ratchet', 'star ratchet']],
  ['hub', ['hub', 'hubs']],
  ['spokes', ['spoke', 'spokes']],
  ['nipples', ['nipple', 'nipples']],
  ['rim', ['rim', 'rims']],
  ['bottom bracket', ['bottom bracket']],
  ['headset', ['headset']],
  ['cable', ['cable kit', 'cable', 'cables', 'housing']],
  ['brake', ['disc brake', 'brake', 'brakes', 'brake set']],
  ['wheelset', ['wheelset', 'wheelsets', 'wheel set']],
  ['groupset', ['groupset', 'group set', 'transmission']],
  ['crankset', ['crankset', 'cranksets', 'crank set']],
  ['shifter', ['shifter', 'shifters', 'shift lever']],
  ['cleats', ['cleat', 'cleats']],
  ['shoes', ['shoe', 'shoes']],
  ['jersey', ['jersey', 'jerseys']],
  ['shorts', ['short', 'shorts', 'bib shorts']],
  ['grips', ['grip', 'grips']],
  ['pedals', ['pedal', 'pedals']],
  ['light', ['headlight', 'tail light', 'taillight', 'light', 'lights', 'lamp']],
  ['helmet', ['helmet', 'helmets']],
  ['saddle', ['saddle', 'saddles']],
  ['dropper', ['dropper', 'dropper post', 'seatpost', 'seat post']],
  ['fork service', ['fork seal', 'seal kit', 'service kit', 'bushing', 'bushings']],
  ['fork', ['fork', 'forks']],
  ['shock', ['rear shock', 'shock', 'shocks']],
  ['bearing', ['bearing', 'bearings']],
  ['gloves', ['glove', 'gloves']],
  ['lock', ['lock', 'locks']],
  ['computer', ['computer', 'gps']],
  ['bell', ['bell', 'bells']],
  ['fender', ['fender', 'fenders', 'mudguard']],
  ['kickstand', ['kickstand']],
  ['stem', ['stem']],
  ['handlebar', ['handlebar', 'handlebars']],
  // Last: only a title that names nothing more specific is a bike.
  ['bike', ['e bike', 'ebike', 'e bikes', 'bike', 'bikes', 'bicycle', 'bicycles']],
]

/** Our product's type from its catalog category, when its name doesn't say (a "Maxxis Rekon" is a tire). */
const CATEGORY_TYPES = { Tires: 'tire', 'Complete bikes': 'bike' }

/** Our own product's type: from its name, else its catalog category. A store result's type always comes from its title. */
export const ownType = (product) => productType(product.name) ?? CATEGORY_TYPES[product.category] ?? null

/** The general product type a name or title describes, or null when it names none we know. */
export function productType(text) {
  const t = ` ${normalize(text)} `
  for (const [type, phrases] of TYPES) if (phrases.some((ph) => t.includes(` ${normalize(ph)} `))) return type
  return null
}

/**
 * The closest result of the same brand and the same general type, or null.
 * Never across types: a result whose own type differs (or can't be read) is
 * rejected. Prefers the most meaningful words of our product name, then the
 * fewest extra words.
 */
export function relaxedMatch(product, results) {
  const type = ownType(product)
  if (!type) return null
  const brand = normalize(product.brand ?? '')
  const want = requiredWords(product.name, product.brand ?? '')
  const wanted = new Set(tokens(product.name))
  let best = null
  for (const r of results) {
    if (!r?.title || !r.image) continue
    if (productType(r.title) !== type) continue
    const title = ` ${normalize(r.title)} `
    if (brand && !title.includes(` ${brand} `) && normalize(r.vendor ?? '') !== brand) continue
    const words = new Set(tokens(r.title))
    const shared = want.filter((w) => words.has(w)).length
    const extra = [...words].filter((w) => !wanted.has(w) && !/^\d/.test(w)).length
    const score = shared * 100 - extra
    if (!best || score > best.score) best = { ...r, score, shared, type }
  }
  return best
}

/** A broader search for the fallback: brand and type ("Bontrager bottle cage"). */
export function relaxedQuery(product) {
  const type = ownType(product)
  return type ? `${product.brand ?? ''} ${type}`.trim() : null
}

/**
 * What to try for one product, given its current manifest entry:
 * 'skip' (an exact image is kept unless refreshing), 'strict', or
 * 'strict+relaxed'. An exact image is never put up for an approximate one;
 * an approximate image always gets a strict retry, so it can be upgraded.
 */
export function plan(existing, { refresh = false, relaxed = false } = {}) {
  const exact = Boolean(existing) && existing.match !== 'approximate'
  if (exact && !refresh) return 'skip'
  return relaxed && !exact ? 'strict+relaxed' : 'strict'
}
