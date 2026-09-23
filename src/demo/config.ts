import 'server-only'

/**
 * Example-data previews (Today recommendations, sample suppliers).
 *
 * DEMO_PREVIEW=1|true|on forces them on; 0|false|off forces them off.
 * Unset: on only in local development (`next dev`), off everywhere else.
 * Demo data lives in code under src/demo and is never written to the database.
 */
export function isDemoPreviewEnabled(): boolean {
  const flag = process.env.DEMO_PREVIEW?.trim().toLowerCase()
  if (flag === '1' || flag === 'true' || flag === 'on') return true
  if (flag === '0' || flag === 'false' || flag === 'off') return false
  return process.env.NODE_ENV === 'development'
}
