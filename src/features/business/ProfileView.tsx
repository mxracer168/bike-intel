import type { ReactNode } from 'react'
import type { ContextEntry } from '@/domain/context/list'
import type { OrganizationDetails } from '@/domain/organization/details'
import { EmptyState } from '@/ui/Feedback'
import { countryName, industryLabel } from './labels'
import styles from './Business.module.css'

function Value({ children }: { children: ReactNode }) {
  return children ? <>{children}</> : <span className={styles.missing}>Not added yet</span>
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className={styles.facts}>
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><Value>{v}</Value></dd></div>)}
    </dl>
  )
}

function lifespanLabel(entry: ContextEntry) {
  if (entry.lifespan === 'evergreen') return 'Ongoing'
  if (!entry.expiresAt) return 'For now'
  const until = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date(entry.expiresAt))
  return `Until ${until}`
}

function Beliefs({ title, entries, inferred }: { title: string; entries: ContextEntry[]; inferred?: boolean }) {
  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <ul className={styles.beliefs}>
        {entries.map((e) => (
          <li key={e.id} className={styles.belief}>
            <p className={styles.beliefText}>{e.statement}</p>
            <span className={styles.beliefMeta}>
              <span>{lifespanLabel(e)}</span>
              {inferred && !e.confirmedAt && <span>· We think so. Tell us if it’s wrong.</span>}
              {inferred && e.confirmedAt && <span>· You confirmed this.</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Everything we hold about the retailer, facts they gave us kept apart from what we inferred. */
export function ProfileView({ org, context }: { org: OrganizationDetails; context: ContextEntry[] }) {
  const stated = context.filter((c) => c.source !== 'system_inferred')
  const inferred = context.filter((c) => c.source === 'system_inferred')
  const billing = [org.billing.line1, org.billing.line2, [org.billing.city, org.billing.region, org.billing.postalCode].filter(Boolean).join(', '), countryName(org.billing.country)].filter(Boolean)

  return (
    <>
      <div className={styles.grid}>
        <section className={styles.group} aria-labelledby="details">
          <h2 id="details" className={styles.knowTitle}>Details</h2>
          <Facts rows={[
            ['Legal name', org.legalName],
            ['Website', org.website && <a href={org.website} target="_blank" rel="noopener noreferrer">{org.website.replace(/^https?:\/\//, '')}</a>],
            ['Country', countryName(org.defaultCountry)],
            ['Industry', industryLabel[org.industry] ?? org.industry],
          ]} />
        </section>
        <section className={styles.group} aria-labelledby="contact">
          <h2 id="contact" className={styles.knowTitle}>Contact and billing</h2>
          <Facts rows={[
            ['Primary contact', org.contact.name],
            ['Email', org.contact.email],
            ['Phone', org.contact.phone],
            ['Billing address', billing.length ? <address className={styles.address}>{billing.map((l) => <span key={l}>{l}<br /></span>)}</address> : null],
          ]} />
        </section>
      </div>

      <section className={styles.group} aria-labelledby="what-we-know">
        <div className={styles.knowHead}>
          <h2 id="what-we-know" className={styles.knowTitle}>What we know about your business</h2>
          <p className={styles.knowLead}>What you’ve told us, kept apart from what we’ve worked out from your sales.</p>
        </div>
        {context.length === 0 ? (
          <EmptyState title="Nothing here yet.">
            As you tell us about your store, your customers and your plans, it will show up here, kept apart from anything we work out ourselves.
          </EmptyState>
        ) : (
          <div className={styles.groups}>
            {stated.length > 0 && <Beliefs title="What you’ve told us" entries={stated} />}
            {inferred.length > 0 && <Beliefs title="What we’ve learned" entries={inferred} inferred />}
          </div>
        )}
      </section>
    </>
  )
}
