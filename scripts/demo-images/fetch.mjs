// Product photos for the EXAMPLE catalog, for local demos only.
//
//   npm run demo:images                 fetch images for products that have none yet
//   npm run demo:images -- --refresh    fetch again for every product
//   npm run demo:images -- --only=maxxis-minion-dhf,kmc-chain
//   npm run demo:images -- --list       list the products and stop (no network)
//   npm run demo:images -- --relaxed    also accept approximate matches where no exact one exists
//
// For each example product it asks a few bike shops' public storefront search
// (Shopify's /search/suggest.json) for the product by name, keeps a result only
// when the name matches strictly (match.mjs), and downloads that result's
// photo. With --relaxed, a product with no strict match may take the closest
// result of the same brand and the same general type (match.mjs, relaxedMatch);
// it is recorded as an approximate match and never replaces an exact one.
// Everything lands in public/demo/products/ (git-ignored): the images,
// manifest.json (read by src/demo/catalog.ts) and review.html, a contact sheet
// to check every match at http://localhost:3000/demo/products/review.html.
// Wrong match? Put the product id in overrides.json: null hides its image, an
// image URL replaces it. Then run again with --only=<id>.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bestMatch, plan, relaxedMatch, relaxedQuery } from './match.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../..')
const outDir = join(root, 'public/demo/products')
const manifestPath = join(outDir, 'manifest.json')

/** Shopify bike shops searched in order. Override with DEMO_IMAGE_STORES=a.com,b.com */
const STORES = (process.env.DEMO_IMAGE_STORES ?? 'worldwidecyclery.com,www.fanatikbike.com,velomine.com').split(',').map((s) => s.trim()).filter(Boolean)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const args = process.argv.slice(2)
const refresh = args.includes('--refresh')
const relaxed = args.includes('--relaxed')
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',').filter(Boolean)

const { demoCatalog } = await import('../../src/demo/catalog.ts')
const products = demoCatalog.filter((p) => !only || only.includes(p.id)).map((p) => ({ id: p.id, name: p.name, brand: p.brand, category: p.category }))

if (args.includes('--list')) {
  for (const p of products) console.log(`${p.id}\t${p.brand}\t${p.name}`)
  process.exit(0)
}

const overrides = JSON.parse(await readFile(join(here, 'overrides.json'), 'utf8').catch(() => '{}'))
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : { products: {} }
await mkdir(outDir, { recursive: true })

async function search(store, query) {
  const url = `https://${store}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=10`
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } })
  if (!res.ok) throw new Error(`${store} answered ${res.status}`)
  const body = await res.json()
  return (body?.resources?.results?.products ?? []).map((p) => ({
    title: p.title, vendor: p.vendor,
    url: new URL(p.url, `https://${store}`).href.split('?')[0],
    image: p.featured_image?.url ?? p.image,
    store,
  }))
}

async function download(imageUrl, id) {
  const url = new URL(imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl)
  if (url.hostname.endsWith('shopify.com') || url.pathname.includes('/cdn/shop/')) url.searchParams.set('width', '1000')
  const res = await fetch(url, { headers: { 'user-agent': UA } })
  if (!res.ok) throw new Error(`image answered ${res.status}`)
  const type = res.headers.get('content-type') ?? ''
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('avif') ? 'avif' : 'jpg'
  const file = `${id}.${ext}`
  await writeFile(join(outDir, file), Buffer.from(await res.arrayBuffer()))
  return `/demo/products/${file}`
}

let found = 0, missed = 0, skipped = 0
const failures = new Set()
for (const p of products) {
  if (p.id in overrides) {
    if (overrides[p.id] === null) { delete manifest.products[p.id]; skipped++; continue }
    if (!refresh && manifest.products[p.id]?.override === overrides[p.id]) { skipped++; continue }
    try {
      const src = await download(overrides[p.id], p.id)
      manifest.products[p.id] = { src, alt: p.name, source: { name: new URL(overrides[p.id]).hostname, url: overrides[p.id] }, matched: '(override)', override: overrides[p.id], match: 'exact' }
      found++; console.log(`✓ ${p.name}  (override)`)
    } catch (e) { missed++; console.log(`✗ ${p.name}  override failed: ${e.message}`) }
    continue
  }
  const existing = manifest.products[p.id]
  const existingExact = Boolean(existing) && existing.match !== 'approximate'
  const steps = plan(existing, { refresh, relaxed })
  if (steps === 'skip') { skipped++; continue }

  // 1. Strict, store by store, keeping each store's results for the fallback.
  let match = null
  const seen = []
  for (const store of STORES) {
    if (failures.has(store)) continue
    try {
      const results = await search(store, p.name)
      seen.push(...results)
      match = bestMatch(p, results)
    } catch (e) {
      console.log(`  ! ${e.message}; skipping ${store} from now on`); failures.add(store)
    }
    await sleep(350)
    if (match) break
  }
  let kind = match ? 'exact' : null

  // 2. Relaxed (only when asked): same brand and type, first among what the name search found, then a brand + type search.
  if (!match && steps === 'strict+relaxed') {
    match = relaxedMatch(p, seen)
    const query = relaxedQuery(p)
    if (!match && query) {
      for (const store of STORES) {
        if (failures.has(store)) continue
        try {
          match = relaxedMatch(p, await search(store, query))
        } catch (e) {
          console.log(`  ! ${e.message}; skipping ${store} from now on`); failures.add(store)
        }
        await sleep(350)
        if (match) break
      }
    }
    if (match) kind = 'approximate'
  }

  if (!match) {
    missed++
    if (existing) { console.log(`· ${p.name}  no ${relaxed ? 'match' : 'exact match'}; keeping the ${existingExact ? 'exact' : 'approximate'} image`); continue }
    console.log(`· ${p.name}  no ${relaxed ? 'match' : 'confident match'}`); continue
  }
  try {
    const src = await download(match.image, p.id)
    manifest.products[p.id] = { src, alt: p.name, source: { name: match.store, url: match.url }, matched: match.title, match: kind }
    found++; console.log(`${kind === 'exact' ? '✓' : '≈'} ${p.name}  ←  ${match.title}  (${match.store}${kind === 'approximate' ? ', approximate' : ''})`)
  } catch (e) { missed++; console.log(`✗ ${p.name}  ${e.message}`) }
  await sleep(200)
}

manifest.generatedAt = new Date().toISOString()
await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
await writeFile(join(outDir, 'review.html'), review(manifest, demoCatalog))
console.log(`\n${found} fetched · ${missed} without a match · ${skipped} unchanged`)
console.log(`Images: ${Object.keys(manifest.products).length} of ${demoCatalog.length} products.`)
console.log('Review every match at http://localhost:3000/demo/products/review.html (with npm run dev running).')

function review(m, catalog) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const entries = catalog.map((p) => [p, m.products[p.id]])
  const exact = entries.filter(([, e]) => e && e.match !== 'approximate').length
  const approx = entries.filter(([, e]) => e?.match === 'approximate').length
  const cards = entries.map(([p, e]) => {
    const kind = !e ? 'none' : e.match === 'approximate' ? 'approximate' : 'exact'
    const badge = kind === 'exact' ? '<em class="exact">Exact</em>' : kind === 'approximate' ? '<em class="approx">Approximate demo match</em>' : ''
    return `<figure class="${kind}">${e ? `<img src="${esc(e.src)}" alt="">` : '<div class="ph">no image</div>'}
      <figcaption>${badge}<b>${esc(p.name)}</b><code>${esc(p.id)}</code>${e ? `<span title="Source product title">${esc(e.matched)}</span><a href="${esc(e.source.url)}" target="_blank" rel="noreferrer">${esc(e.source.name)}</a>` : ''}</figcaption></figure>`
  }).join('\n')
  return `<!doctype html><meta charset="utf-8"><title>Example catalog images</title>
<style>body{font:13px system-ui;margin:24px;background:#f8fafc;color:#0f172a}p{max-width:60em}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
figure{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}figure.none{opacity:.55}
figure.approximate{border-color:#fcd34d;box-shadow:inset 0 0 0 1px #fcd34d}
img,.ph{width:100%;aspect-ratio:3/2;object-fit:contain;background:#fff;display:grid;place-items:center;color:#94a3b8}
figcaption{display:flex;flex-direction:column;gap:3px;padding:10px}code{color:#64748b}span{color:#475569}
em{align-self:flex-start;font-style:normal;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px}
em.exact{background:#ecfdf5;color:#047857}em.approx{background:#fffbeb;color:#b45309}
.legend em{margin-right:6px}</style>
<h1>Example catalog images</h1>
<p class="legend"><em class="exact">Exact</em>${exact} &nbsp; <em class="approx">Approximate demo match</em>${approx} &nbsp; no image ${catalog.length - exact - approx}</p>
<p>Exact: the store's title names this product. Approximate demo match (from <code>--relaxed</code>): the same brand and the
same kind of product, possibly another size, color, pack or model; the store's own title is shown under each one.
Check each image. To fix one, add its id to <code>scripts/demo-images/overrides.json</code> (<code>null</code> hides it, an image URL
replaces it) and run <code>npm run demo:images -- --only=&lt;id&gt;</code>.</p><main>${cards}</main>`
}
