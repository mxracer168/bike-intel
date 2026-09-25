import Link from 'next/link'
import type { ReactNode } from 'react'
import { ExampleMarker } from '@/ui/Example'
import { connectionText, type SupplierAccountView } from './account'
import { monogram, type RelationshipView, type SupplierPresentation, type SupplierSection } from './presentation'
import { FitScore, ProgramFit } from './ProgramFit'
import type { ProgramFitMap } from './programFit'
import { RelationshipTag } from './RelationshipTag'
import { CopyButton, ManageConnection, UploadProgram } from './SupplierActions'
import styles from './Suppliers.module.css'

/** What the retailer brings to the page (never part of the supplier's own presentation). */
type RetailerContext = { retailerName: string; supplierName: string; programFit: ProgramFitMap }

type Contact = Extract<SupplierSection, { type: 'contact' }>

/**
 * The main column: about, ordering details, then programs, the reason to come
 * back. Brands aren't shown (product search will cover them) and contacts
 * live in the "Your account" rail.
 */
const ORDER: SupplierSection['type'][] = ['about', 'facts', 'programs']

const renderers: { [K in 'about' | 'facts' | 'programs']: (s: Extract<SupplierSection, { type: K }>, ctx: RetailerContext) => ReactNode } = {
  about: (s) => (
    <div className={styles.prose}>{s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
  ),
  facts: (s) => (
    <dl className={styles.facts}>
      {s.items.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
    </dl>
  ),
  programs: (s, ctx) => (
    <ul className={styles.programs}>
      {s.programs.map((p) => {
        const fit = ctx.programFit[p.name]
        return (
          <li key={p.name} className={styles.program}>
            <div className={styles.programTop}>
              <h3 className={styles.programName}>{p.name}</h3>
              {fit && <FitScore fit={fit} />}
            </div>
            <div className={styles.programTop}>
              {p.season ? <span className={styles.programMeta}>{p.season}</span> : <span />}
              {p.closes && <span className={styles.programMeta}>Closes {p.closes}</span>}
            </div>
            <p className={styles.programSummary}>{p.summary}</p>
            {fit && <ProgramFit fit={fit} retailerName={ctx.retailerName} programName={p.name} />}
          </li>
        )
      })}
    </ul>
  ),
}

const defaultTitle = { about: 'About', facts: 'Ordering', programs: 'Programs' } as const

function Section({ section, index, ctx }: { section: SupplierSection; index: number; ctx: RetailerContext }) {
  if (section.type !== 'about' && section.type !== 'facts' && section.type !== 'programs') return null
  const render = renderers[section.type] as (s: SupplierSection, ctx: RetailerContext) => ReactNode
  const id = `supplier-section-${index}`
  return (
    <section className={[styles.section, section.type === 'programs' && styles.programsSection].filter(Boolean).join(' ')} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h2 id={id} className={section.type === 'facts' ? styles.sectionTitleSmall : styles.sectionTitle}>
          {section.title ?? defaultTitle[section.type]}
        </h2>
        {section.type === 'programs' && <UploadProgram supplierName={ctx.supplierName} />}
      </div>
      {render(section, ctx)}
    </section>
  )
}

const displayUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

/**
 * A supplier's page: identity with the retailer's standing, then about,
 * ordering and programs. A sticky rail holds the retailer's private account
 * details and how we connect to the supplier.
 */
export function SupplierProfile({ presentation, relationship, retailerName, programFit = {}, account = {}, example = false }: {
  presentation: SupplierPresentation
  relationship: RelationshipView
  retailerName: string
  programFit?: ProgramFitMap
  account?: SupplierAccountView
  example?: boolean
}) {
  const { identity, sections } = presentation
  const ctx = { retailerName, supplierName: identity.name, programFit }
  const main = ORDER.flatMap((type) => sections.filter((s) => s.type === type))
  const contact = sections.find((s): s is Contact => s.type === 'contact')
  const current = relationship.status === 'claimed' || relationship.status === 'verified'
  const connection = account.connection ?? { mode: 'manual' as const }

  return (
    <>
      <Link href="/suppliers" className={styles.back}>← All suppliers</Link>

      <header className={styles.hero}>
        <span className={`${styles.monogram} ${styles.monogramLarge}`} aria-hidden="true">{monogram(identity.name)}</span>
        <div className={styles.heroText}>
          <p className={styles.status}>
            {current || relationship.status === 'inactive' || relationship.status === 'suspended'
              ? <RelationshipTag relationship={relationship} />
              : 'Not currently a supplier'}
            {example && <ExampleMarker />}
          </p>
          <h1 className={styles.heroName}>{identity.name}</h1>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          {main.length > 0
            ? main.map((s, i) => <Section key={i} section={s} index={i} ctx={ctx} />)
            : <p className={styles.sparse}>{identity.name} hasn’t added more about themselves yet.</p>}
        </div>

        <aside className={styles.aside} aria-label="Your account and connection">
          <section className={styles.panel} aria-labelledby="supplier-account">
            <h2 id="supplier-account" className={styles.panelTitle}>Your account</h2>
            <dl className={styles.railList}>
              {account.accountNumber && (
                <div>
                  <dt>Account number</dt>
                  <dd className={styles.accountNumber}>
                    <span>{account.accountNumber}</span>
                    <CopyButton value={account.accountNumber} label="account number" />
                  </dd>
                </div>
              )}
              {identity.website && (
                <div>
                  <dt>Website</dt>
                  <dd><a href={identity.website} target="_blank" rel="noopener noreferrer">{displayUrl(identity.website)}</a></dd>
                </div>
              )}
              {contact?.people.map((p) => (
                <div key={p.role}>
                  <dt>{p.role}</dt>
                  <dd className={styles.person}>
                    {p.name && <b>{p.name}</b>}
                    {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
                    {p.phone && <span>{p.phone}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {!account.accountNumber && !identity.website && !contact && (
              <p className={styles.railNote}>Your account number and contacts at {identity.name} will show here. Only your business sees them.</p>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="supplier-connection">
            <h2 id="supplier-connection" className={styles.panelTitle}>Connection</h2>
            <p className={styles.connection}>
              <span className={[styles.dot, connection.mode === 'api' && styles.dotOn].filter(Boolean).join(' ')} aria-hidden="true" />
              <b>{connectionText[connection.mode].title}</b>
            </p>
            <p className={styles.railNote}>{connectionText[connection.mode].detail}</p>
            {connection.lastSynced && (
              <dl className={styles.railList}>
                <div><dt>Last synced</dt><dd>{connection.lastSynced}</dd></div>
              </dl>
            )}
            <ManageConnection />
          </section>
        </aside>
      </div>
    </>
  )
}
