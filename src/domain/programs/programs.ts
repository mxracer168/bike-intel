import type { Db } from '@/lib/supabase/types'
import { byFit, formatDay, formatWindow, pickVersion } from '@/features/programs/format'
import type { ProgramDetailView, ProgramSummary, ProgramTerm } from '@/features/programs/types'

/**
 * The programs a retailer sees: their own (uploaded, always private) and the
 * ones suppliers have published. Row-level security decides what's readable;
 * a published program the retailer has linked to their own copy shows once,
 * as their copy. Program fit isn't computed yet, so none is returned.
 */
async function load(db: Db, retailerId: string, programId?: string) {
  let query = db.from('program')
    .select('id, owner_organization_id, supplier_market_id, name, season_label')
    .eq('status', 'active')
  if (programId) query = query.eq('id', programId)
  const { data: programs, error } = await query
  if (error) throw error
  if (!programs?.length) return []

  const ids = programs.map((p) => p.id)
  const marketIds = [...new Set(programs.map((p) => p.supplier_market_id))]
  const [versions, links, markets] = await Promise.all([
    db.from('program_version')
      .select('id, program_id, version_number, status, summary, order_window_end, ship_window_start, ship_window_end')
      .in('program_id', ids),
    db.from('program_link').select('official_program_id').eq('organization_id', retailerId).eq('status', 'confirmed'),
    db.from('supplier_market').select('id, supplier_organization_id').in('id', marketIds),
  ])
  if (versions.error) throw versions.error
  if (links.error) throw links.error
  if (markets.error) throw markets.error

  const orgIds = [...new Set((markets.data ?? []).map((m) => m.supplier_organization_id))]
  const { data: orgs, error: oErr } = orgIds.length
    ? await db.from('organization').select('id, name').in('id', orgIds)
    : { data: [], error: null }
  if (oErr) throw oErr

  const linked = new Set((links.data ?? []).map((l) => l.official_program_id))
  const supplierOf = new Map((markets.data ?? []).map((m) => [m.id, (orgs ?? []).find((o) => o.id === m.supplier_organization_id)]))

  return programs
    .filter((p) => p.owner_organization_id === retailerId || !linked.has(p.id))
    .map((p) => {
      const version = pickVersion((versions.data ?? []).filter((v) => v.program_id === p.id))
      const org = supplierOf.get(p.supplier_market_id)
      const summary: ProgramSummary = {
        id: p.id,
        name: p.name,
        supplier: { name: org?.name ?? 'Supplier', href: org ? `/suppliers/${org.id}` : undefined },
        season: p.season_label ?? undefined,
        closes: version?.order_window_end ? formatDay(version.order_window_end) : undefined,
        delivery: version ? formatWindow(version.ship_window_start, version.ship_window_end) : undefined,
        summary: version?.summary ?? undefined,
        own: p.owner_organization_id === retailerId,
        example: false,
      }
      return { summary, version }
    })
}

export async function listPrograms(db: Db, retailerId: string): Promise<ProgramSummary[]> {
  return (await load(db, retailerId)).map((r) => r.summary).sort(byFit)
}

export async function getProgram(db: Db, retailerId: string, programId: string): Promise<ProgramDetailView | null> {
  const [row] = await load(db, retailerId, programId)
  if (!row) return null
  let terms: ProgramTerm[] = []
  if (row.version) {
    const { data, error } = await db.from('program_rule')
      .select('rule_type, tier_label, threshold_type, threshold_value, threshold_currency, benefit_type, benefit_value, source_text')
      .eq('program_version_id', row.version.id)
      .order('sequence')
    if (error) throw error
    terms = (data ?? []).map(termFrom).filter((t): t is ProgramTerm => t !== null)
  }
  return { ...row.summary, terms, confirmed: row.version?.status === 'confirmed' }
}

const ruleLabel: Record<string, string> = { tier: 'Tier', requirement: 'Requirement', benefit: 'Benefit', condition: 'Condition', other: 'Term' }

/** One rule in plain words: the supplier's own wording when we have it. */
export function termFrom(r: {
  rule_type: string; tier_label: string | null; threshold_type: string | null; threshold_value: number | null
  threshold_currency: string | null; benefit_type: string | null; benefit_value: number | null; source_text: string | null
}): ProgramTerm | null {
  const label = r.tier_label?.trim() || ruleLabel[r.rule_type] || 'Term'
  if (r.source_text?.trim()) return { label, detail: r.source_text.trim() }
  const parts: string[] = []
  if (r.benefit_value != null && r.benefit_type === 'percent_discount') parts.push(`${trim(r.benefit_value)}% off`)
  else if (r.benefit_type === 'free_freight') parts.push('Free freight')
  if (r.threshold_value != null && r.threshold_type === 'quantity') parts.push(`at ${trim(r.threshold_value)} units or more`)
  else if (r.threshold_value != null && r.threshold_type === 'amount') parts.push(`on orders of ${r.threshold_currency ?? ''} ${trim(r.threshold_value)} or more`.replace('  ', ' '))
  return parts.length ? { label, detail: parts.join(' ') } : null
}

function trim(n: number): string {
  return Number(n.toFixed(2)).toLocaleString('en-US')
}
