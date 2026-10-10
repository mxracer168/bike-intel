// Lets plain Node load the app's TypeScript example data: "@/…" points at src/,
// and extensionless imports find their .ts / .tsx file. Types are stripped by
// Node itself (22.18+, or 22.6+ with --experimental-strip-types).
import { statSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const src = resolvePath(dirname(fileURLToPath(import.meta.url)), '../../src')
const isFile = (p) => { try { return statSync(p).isFile() } catch { return false } }

export async function resolve(specifier, context, next) {
  let base
  if (specifier.startsWith('@/')) base = resolvePath(src, specifier.slice(2))
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) base = fileURLToPath(new URL(specifier, context.parentURL))
  else return next(specifier, context)
  const found = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(isFile)
  return next(found ? pathToFileURL(found).href : specifier, context)
}
