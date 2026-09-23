import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function files(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path, exts)
    return exts.some((e) => path.endsWith(e)) ? [path] : []
  })
}

const source = files('src', ['.css', '.tsx', '.ts']).filter((f) => !f.endsWith('database.types.ts'))

describe('Visual Direction: tokens only', () => {
  it('has no raw colors outside design/tokens.css', () => {
    const offenders = source
      .filter((f) => !f.endsWith(join('design', 'tokens.css')))
      .filter((f) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('never uses all-caps text styling', () => {
    const offenders = source.filter((f) => /text-transform:\s*uppercase/i.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('uses only the approved font weights (400, 500, 600)', () => {
    const offenders = source.filter((f) => /font-weight:\s*(?!400|500|600|inherit)\d+/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})

/** Comments explain rules; only code and copy are checked. */
function withoutComments(text: string) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('Voice: human language', () => {
  // User-facing copy lives in content, pages, forms and components.
  const copy = source.filter((f) => /src\/(content|app|forms|ui)\//.test(f))
  const banned: [RegExp, string][] = [
    [/\bAI\b/, '"AI" label'],
    [/optimi[sz]ation/i, 'system jargon "optimization"'],
    [/SKU velocity/i, '"SKU velocity"'],
    [/\b(ROP|WOS)\b/, 'inventory acronyms'],
    [/✨|🤖/u, 'sparkles or robots'],
    [/Are you sure/i, 'confirmation-dialog phrasing; prefer undo'],
    [/\bsubmit\b(?=[^=]*<\/)/i, '"Submit" as a button label; say what happens'],
  ]
  for (const [pattern, what] of banned) {
    it(`does not use ${what}`, () => {
      const offenders = copy.filter((f) => pattern.test(withoutComments(readFileSync(f, 'utf8'))))
      expect(offenders).toEqual([])
    })
  }
})
