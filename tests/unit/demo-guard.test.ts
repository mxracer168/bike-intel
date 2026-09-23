import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Example data must stay in clearly separated places. Only these files may
 * import from src/demo. Adding one here is a deliberate, reviewed decision.
 */
const ALLOWED = new Set([
  'src/app/(app)/today/page.tsx',
  'src/app/(app)/suppliers/page.tsx',
  'src/app/(app)/suppliers/[supplierId]/page.tsx',
])

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(path) ? [path] : []
  })
}

describe('demo data isolation', () => {
  const importers = files('src')
    .filter((f) => !f.startsWith(join('src', 'demo')))
    .filter((f) => /from ['"]@\/demo\//.test(readFileSync(f, 'utf8')))
    .map((f) => relative('.', f).split('\\').join('/'))

  it('is imported only from approved pages', () => {
    expect(importers.filter((f) => !ALLOWED.has(f))).toEqual([])
  })

  it('checks the demo switch wherever it is imported', () => {
    const unchecked = importers.filter((f) => !readFileSync(f, 'utf8').includes('isDemoPreviewEnabled('))
    expect(unchecked).toEqual([])
  })

  it('never touches the database from demo modules', () => {
    const demoFiles = files(join('src', 'demo'))
    const offenders = demoFiles.filter((f) => /supabase|\.from\(|\.rpc\(|\.insert\(/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
