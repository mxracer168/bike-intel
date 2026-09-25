import Link from 'next/link'
import type { ReactNode } from 'react'
import { ExampleMarker } from '@/ui/Example'
import { Icon } from '@/ui/Icon'
import { kindLabel, monogram, type RelationshipView, type SupplierPresentation, type SupplierSection } from './presentation'
import { ProgramFit } from './ProgramFit'
import type { ProgramFitMap } from './programFit'
import { RelationshipTag } from './RelationshipTag'
import styles from './Suppliers.module.css'

/** What the retailer brings to the page (never part of the supplier's own presentation). */
type RetailerContext = { retailerName: string; programFit: ProgramFitMap }

/** One renderer per section type. New types are added here, not by reshaping the page. */
const renderers: { [K in SupplierSection['type']]: (s: Extract<SupplierSection, { type: K }>, ctx: RetailerContext) => ReactNode } = {
  about: (s) => (
    <div className={styles.prose}>{s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
  ),
  facts: (s) => (
    <dl className={styles.facts}>
      {s.items.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
    </dl>
  ),
  brands: (s) => (
    <ul className={styles.brands}>{s.brands.map((b) => <li key={b}>{b}</li>)}</ul>
  ),
  programs: (s, ctx) => (
    <ul className={styles.programs}>
      {s.programs.map((p) => {
        const fit = ctx.programFit[p.name]
        return (
          <li key={p.name} className={styles.program}>
            <div className={styles.programMain}>
              <span className={styles.programName}>{p.name}</span>
              {p.season && <span className={styles.programMeta}>{p.season}</span>}
              <p className={styles.programSummary}>{p.summary}</p>
            </div>
            {fit
              ? <ProgramFit fit={fit} closes={p.closes} retailerName={ctx.retailerName} programName={p.name} />
              : p.closes && <div className={styles.programSide}><p className={styles.programMeta}>Closes {p.closes}</p></div>}
          </li>
        )
      })}
    </ul>
  ),
  contact: (s) => (
    <>
      <ul className={styles.people}>
        {s.people.map((p) => (
          <li key={p.role} className={styles.person}>
            <span className={styles.personRole}>{p.role}</span>
            {p.name && <b>{p.name}</b>}
            {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
            {p.phone && <span>{p.phone}</span>}
          </li>
        ))}
      </ul>
      {s.note && <p className={styles.note}>{s.note}</p>}
    </>
  ),
}

const defaultTitle: Record<SupplierSection['type'], string> = {
  about: 'About',
  facts: 'At a glance',
  brands: 'Brands',
  programs: 'Programs',
  contact: 'Contacts',
}

function Section({ section, index, ctx }: { section: SupplierSection; index: number; ctx: RetailerContext }) {
  const render = renderers[section.type] as (s: SupplierSection, ctx: RetailerContext) => ReactNode
  const id = `supplier-section-${index}`
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>{section.title ?? defaultTitle[section.type]}</h2>
      {render(section, ctx)}
    </section>
  )
}

function relationshipText(r: RelationshipView, name: string) {
  switch (r.status) {
    case 'verified':
    case 'claimed':
      return r.preference === 'preferred'
        ? `${name} is one of your preferred suppliers. We’ll lean toward them when options are close.`
        : `You buy from ${name}.`
    case 'inactive':
    case 'suspended':
      return `You’re not buying from ${name} at the moment.`
    default:
      return `You haven’t told us you buy from ${name}.`
  }
}

/**
 * A supplier's page: identity, then whatever sections the supplier has, then
 * the retailer's own relationship. Sparse and rich pages share one layout.
 */
export function SupplierProfile({ presentation, relationship, retailerName, programFit = {}, example = false }: {
  presentation: SupplierPresentation; relationship: RelationshipView; retailerName: string; programFit?: ProgramFitMap; example?: boolean
}) {
  const { identity, sections } = presentation
  const ctx = { retailerName, programFit }
  return (
    <>
      <Link href="/suppliers" className={styles.back}>← All suppliers</Link>

      <header className={styles.hero}>
        <span className={`${styles.monogram} ${styles.monogramLarge}`} aria-hidden="true">{monogram(identity.name)}</span>
        <div className={styles.heroText}>
          {example && <span><ExampleMarker /></span>}
          <h1 className={styles.heroName}>{identity.name}</h1>
          {identity.tagline && <p className={styles.heroTagline}>{identity.tagline}</p>}
          <div className={styles.heroMeta}>
            {identity.kind && <span>{kindLabel[identity.kind]}</span>}
            {identity.markets.length > 0 && <span>Serves {identity.markets.map((m) => m.name).join(' and ')}</span>}
            {identity.website && (
              <a href={identity.website} target="_blank" rel="noopener noreferrer">
                Website <Icon name="external" size={12} />
              </a>
            )}
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          {sections.length > 0
            ? sections.map((s, i) => <Section key={i} section={s} index={i} ctx={ctx} />)
            : <p className={styles.sparse}>{identity.name} hasn’t added more about themselves yet.</p>}
        </div>

        <aside className={styles.aside} aria-label="Your relationship">
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Your relationship</h2>
            {relationship.status !== 'none' && <div className={styles.tagRow}><RelationshipTag relationship={relationship} /></div>}
            <p className={styles.panelText}>{relationshipText(relationship, identity.name)}</p>
            <p className={styles.panelText}>
              Your terms, pricing and history with {identity.name} will show here. Only your business sees them.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
