// Fails if anything secret appears in the browser bundles of a production build.
// Run after `next build`. In CI the build uses a canary secret value.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = '.next/static'
const needles = ['SUPABASE_SECRET_KEY', 'sb_secret_']
if (process.env.SUPABASE_SECRET_KEY) needles.push(process.env.SUPABASE_SECRET_KEY)

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else yield path
  }
}

let scanned = 0
const hits = []
for (const file of files(root)) {
  scanned++
  const text = readFileSync(file, 'utf8')
  for (const needle of needles) if (text.includes(needle)) hits.push(`${file}: contains "${needle.slice(0, 12)}…"`)
}

if (scanned === 0) {
  console.error(`No files found under ${root}. Run \`next build\` first.`)
  process.exit(1)
}
if (hits.length) {
  console.error('Secret material found in browser bundles:\n' + hits.join('\n'))
  process.exit(1)
}
console.log(`No secret material in ${scanned} browser bundle files.`)
