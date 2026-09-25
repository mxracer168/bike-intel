/**
 * Migrations are applied to the live project by hand, so a deploy can run
 * briefly against a database that doesn't have the newest tables or columns
 * yet. Code that reads them recognizes that case and degrades to what the
 * older schema can answer, instead of failing the whole page.
 */
type PgError = { code?: string } | null | undefined

/** The table (or view) doesn't exist yet. */
export function isMissingTable(error: PgError): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

/** A selected column doesn't exist yet. */
export function isMissingColumn(error: PgError): boolean {
  return error?.code === '42703' || error?.code === 'PGRST204'
}
