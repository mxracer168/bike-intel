import type { ReactNode } from 'react'
import type { ContextEntry } from '@/domain/context/list'
import type { OrganizationDetails } from '@/domain/organization/details'
import type { BusinessInstructions as Instructions } from '@/domain/instructions/read'
import { OpenConversationLink } from '@/features/intelligence/OpenConversationLink'
import { BusinessInstructions } from './BusinessInstructions'
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
  if (entry.lifespan === 'seasonal') return 'Seasonal'
  if (!entry.expiresAt) return 'For now'
  const until = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date(entry.expiresAt))
  return `Until ${until}`
}

const lifespanRank = { evergreen: 0, seasonal: 1, temporary: 2 } as const
function knowledgeOrder(a: ContextEntry, b: ContextEntry) {
  const inferred = (e: ContextEntry) => (e.source === 'system_inferred' ? 1 : 0)
  return inferred(a) - inferred(b) || lifespanRank[a.lifespan] - lifespanRank[b.lifespan]
}

function sourceLabel(entry: ContextEntry) {
  if (entry.source === 'system_inferred') return entry.confirmedAt ? 'We noticed this; you confirmed it' : 'We think so; tell us if it’s wrong'
  if (entry.source === 'imported') return 'From your records'
  return entry.fromConversation ? 'You told us in conversation' : 'You told us'
}

/** One quiet list: the statement, then where it came from and how long it holds. */
function Knowledge({ entries }: { entries: ContextEntry[] }) {
  return (
    <ul className={styles.beliefs}>
      {entries.map((e) => (
        <li key={e.id} className={styles.belief}>
          <p className={styles.beliefText}>{e.statement}</p>
          <p className={[styles.beliefMeta, e.source === 'system_inferred' && !e.confirmedAt && styles.inferred].filter(Boolean).join(' ')}>
            {sourceLabel(e)} · {lifespanLabel(e)}
          </p>
        </li>
      ))}
    </ul>
  )
}

/**
 * Everything we hold about the retailer: their details, their business
 * instructions (highest authority), then what we know, with what they told us
 * kept apart from what we inferred. `instructions` is null before the
 * business-instructions migration is applied.
 */
export function ProfileView({ org, context, instructions, canEditInstructions }: {
  org: OrganizationDetails; context: ContextEntry[]; instructions: Instructions | null; canEditInstructions: boolean
}) {
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

      <div className={styles.sections}>
        {instructions && <BusinessInstructions instructions={instructions} canEdit={canEditInstructions} />}

        <section className={styles.group} aria-labelledby="what-we-know">
          <div className={styles.knowHead}>
            <h2 id="what-we-know" className={styles.knowTitle}>What we know about your business</h2>
            <p className={styles.small}>What you’ve told us and what we’ve noticed. It shapes recommendations, but never overrides your instructions.</p>
          </div>
          {context.length === 0 ? (
            <p className={styles.small}>
              Nothing yet. What you tell us in the conversation will show up here once we’ve understood it.{' '}
              <OpenConversationLink />
            </p>
          ) : (
            // What you told us first, then what we've inferred; ongoing before temporary.
            <Knowledge entries={[...context].sort(knowledgeOrder)} />
          )}
        </section>
      </div>
    </>
  )
}
