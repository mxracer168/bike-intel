import Link from 'next/link'
import { formatFit } from '@/features/suppliers/programFit'
import { ButtonLink } from '@/ui/Button'
import { Icon } from '@/ui/Icon'
import { AssessmentCard, RepFeedback } from './ProgramClient'
import type { ProgramDetailView, ProgramSummary } from './types'
import styles from './Programs.module.css'

/**
 * Programs, one quiet card each, the whole card a link to the program. The
 * same card on the Programs page and on a supplier's page; `from` tells the
 * program page where its back arrow returns.
 */
export function ProgramList({ programs, from = 'programs' }: { programs: ProgramSummary[]; from?: 'programs' | 'supplier' }) {
  // On a supplier page the cards sit under its "Programs" heading.
  const Title = from === 'supplier' ? 'h3' : 'h2'
  return (
    <ul className={styles.list}>
      {programs.map((p) => (
        <li key={p.id}>
          <Link href={`/programs/${p.id}${from === 'supplier' ? '?from=supplier' : ''}`} className={styles.row}>
            <div className={styles.rowName}>
              <p className={styles.rowSupplier}>{p.supplier.name}{p.own && ' · Uploaded by you'}</p>
              <Title className={styles.rowTitle}>{p.name}</Title>
            </div>
            <div className={styles.rowFit}>
              {p.fit ? (
                <>
                  <p className={styles.rowScore}>{formatFit(p.fit.score)}<span className={styles.scale}> / 5</span></p>
                  <p className={styles.meta}>Program fit</p>
                </>
              ) : p.season && <p className={styles.rowSeason}>{p.season}</p>}
            </div>
            <div className={styles.rowTerms}>
              {p.benefit && <p className={styles.benefit}>{p.benefit}</p>}
              <p className={styles.meta}>{[p.commitment, p.closes && `Closes ${p.closes}`].filter(Boolean).join(' · ') || p.summary}</p>
            </div>
            <span className={styles.go} aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * One program: what it is, how well it fits, the strongest reasons for and
 * against, and what would make it stronger. The analysis appears only where
 * it exists; a program without one shows its terms as stored.
 */
export function ProgramDetail({ program: p, retailerName, from = 'programs' }: {
  program: ProgramDetailView
  retailerName: string
  /** Where the retailer came from: the back arrow returns there. */
  from?: 'programs' | 'supplier'
}) {
  const back = from === 'supplier' && p.supplier.href
    ? { href: p.supplier.href, label: `Back to ${p.supplier.name}` }
    : { href: '/programs', label: 'Back to programs' }
  const a = p.analysis
  const eyebrow = [p.supplier.name, p.closes && `Closes ${p.closes}`].filter(Boolean).join(' · ')
  const meta = [p.season, p.delivery && `Delivery ${p.delivery}`].filter(Boolean).join(' · ')
  return (
    <>
      <header className={styles.head}>
        <div className={styles.headMain}>
          <Link href={back.href} className={styles.back} aria-label={back.label}><Icon name="chevron-left" size={18} /></Link>
          <div className={styles.headText}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{p.name}</h1>
            {meta && <p className={styles.meta}>{meta}</p>}
          </div>
        </div>
        {p.supplier.href && <ButtonLink href={p.supplier.href} variant="secondary">Supplier page</ButtonLink>}
      </header>

      <AssessmentCard fit={p.fit} retailerName={retailerName} programName={p.name}>
        <div className={styles.verdict}>
          <p className={styles.eyebrow}>{a || p.fit ? 'Assessment' : 'The program'}</p>
          <div className={styles.verdictRow}>
            {p.fit && <p className={styles.score}>{formatFit(p.fit.score)} <span className={styles.scoreScale}>/ 5</span></p>}
            <div className={styles.verdictText}>
              {a && <h2 className={styles.headline}>{a.headline}</h2>}
              <p className={styles.lead}>{a?.lead ?? p.summary ?? 'No summary yet.'}</p>
              {a && p.summary && <p className={styles.summary}>{p.summary}</p>}
              {!p.fit && (
                <p className={styles.summary}>
                  Program fit isn’t available for this program yet. It needs your sales history and inventory,
                  and is never affected by supplier payments.
                </p>
              )}
            </div>
          </div>
        </div>
        <dl className={styles.figures}>
          {(a?.figures ?? [
            { label: 'Season', value: p.season ?? 'Not stated' },
            { label: 'Closes', value: p.closes ?? 'Not stated' },
            { label: 'Delivery', value: p.delivery ?? 'Not stated' },
            { label: 'Terms', value: p.confirmed ? 'Confirmed' : 'Draft, not yet checked' },
          ]).map((f) => (
            <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
          ))}
        </dl>
      </AssessmentCard>

      {a && (a.favor.length > 0 || a.risks.length > 0) && (
        <section className={styles.section} aria-labelledby="brief">
          <div>
            <p className={styles.eyebrowQuiet}>Decision brief</p>
            <h2 id="brief" className={styles.sectionTitle}>The strongest reasons for and against</h2>
          </div>
          <div className={styles.brief}>
            <Reasons title="What works in your favor" tone="pos" items={a.favor} />
            <Reasons title="Top risks to resolve" tone="con" items={a.risks} />
          </div>
        </section>
      )}

      {p.terms.length > 0 && (
        <section className={styles.section} aria-labelledby="terms">
          <h2 id="terms" className={styles.sectionTitle}>Terms</h2>
          <dl className={styles.terms}>
            {p.terms.map((t, i) => <div key={i}><dt>{t.label}</dt><dd>{t.detail}</dd></div>)}
          </dl>
          {!p.confirmed && <p className={styles.meta}>These terms were read from the program document and haven’t been checked yet.</p>}
        </section>
      )}

      {a && a.asks.length > 0 && (
        <section className={styles.negotiate} aria-labelledby="negotiate">
          <div>
            <p className={styles.eyebrow}>Negotiating points</p>
            <h2 id="negotiate" className={styles.sectionTitle}>What would make this program stronger?</h2>
            <p className={styles.negotiateLead}>
              Select the changes that matter to you. We’ll turn them into clear feedback
              for your {p.supplier.name} sales rep, ready to copy or send from your email.
            </p>
          </div>
          <RepFeedback asks={a.asks} programName={p.name} retailerName={retailerName} rep={p.rep} />
        </section>
      )}
    </>
  )
}

function Reasons({ title, tone, items }: { title: string; tone: 'pos' | 'con'; items: { title: string; text: string }[] }) {
  return (
    <div className={styles.reasons}>
      <h3 className={[styles.reasonsTitle, styles[tone]].join(' ')}>{title}</h3>
      <ul className={styles.reasonList}>
        {items.map((r) => (
          <li key={r.title} className={styles.reason}>
            <span className={[styles.reasonMark, styles[`${tone}Mark`]].join(' ')} aria-hidden="true">
              <Icon name={tone === 'pos' ? 'check' : 'minus'} size={12} />
            </span>
            <span>
              <span className={styles.reasonTitle}>{r.title}</span>
              <span className={styles.reasonText}>{r.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
