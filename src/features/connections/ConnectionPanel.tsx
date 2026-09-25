'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '@/ui/Icon'
import { LogoTile, Status } from './Parts'
import { isConnected } from './filter'
import { kindLabel, methodLabel, type ConnectionView } from './types'
import styles from './Connections.module.css'

type Tab = 'overview' | 'settings' | 'history'
const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'settings', label: 'Settings' },
  { id: 'history', label: 'Sync history' },
]

/** Nothing here reaches a provider yet: every action says so instead of pretending. */
const NOT_YET = 'Not available in this preview yet. Nothing was sent or saved.'

function Copy({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked: the value is on screen to select by hand.
    }
  }
  return (
    <button type="button" className={styles.iconButton} onClick={copy} aria-label={copied ? `${label} copied` : `Copy ${label}`} title={copied ? 'Copied' : 'Copy'}>
      <Icon name={copied ? 'check' : 'copy'} />
    </button>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>{title}</h3>
      {children}
    </section>
  )
}

function DataAccess({ c }: { c: ConnectionView }) {
  return (
    <ul className={styles.access}>
      {c.capabilities.map((cap) => (
        <li key={cap.title}>
          <span className={styles.check}><Icon name="check" size={14} /></span>
          <span><b>{cap.title}</b><span className={styles.muted}>{cap.detail}</span></span>
        </li>
      ))}
    </ul>
  )
}

/** Connected (or needing attention): what it does, how it's reached, and the few actions a retailer takes. */
function ConnectedOverview({ c, onReconnect }: { c: ConnectionView; onReconnect: () => void }) {
  const [note, setNote] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      {c.status === 'attention' && c.attention && (
        <div className={styles.attention} role="note">
          <p>{c.attention}</p>
          <button type="button" className={styles.outlined} onClick={onReconnect}>Reconnect</button>
        </div>
      )}

      <Block title="Connection">
        <dl className={styles.rows}>
          <div><dt>Status</dt><dd>{c.status === 'attention' ? 'Not syncing' : methodLabel[c.method]}</dd></div>
          {c.lastSync && <div><dt>Last sync</dt><dd>{c.lastSync}</dd></div>}
        </dl>
      </Block>

      <Block title="Data access">
        <DataAccess c={c} />
      </Block>

      <Block title="Order submission">
        {c.orderSubmission
          ? <p className={styles.plain}><b>Enabled</b><span className={styles.muted}>You can send orders directly to {c.name} through the connection.</span></p>
          : <p className={styles.plain}><b>Not available</b><span className={styles.muted}>{c.name} doesn’t take orders through this connection yet.</span></p>}
      </Block>

      {c.credentials && c.credentials.length > 0 && (
        <Block title="Credentials">
          <dl className={styles.rows}>
            {c.credentials.map((cred) => (
              <div key={cred.label}>
                <dt>{cred.label}</dt>
                <dd className={styles.credential}>
                  <span className={styles.mono}>{cred.value}</span>
                  {/* A masked secret is never copyable: the page doesn't have it. */}
                  {!cred.masked && <Copy value={cred.value} label={cred.label.toLowerCase()} />}
                </dd>
              </div>
            ))}
          </dl>
        </Block>
      )}

      {c.supplierHref && <Link href={c.supplierHref} className={styles.supplierLink}>View {c.name} supplier page</Link>}

      <div className={styles.panelActions}>
        {confirming ? (
          <div className={styles.confirm} role="group" aria-label={`Disconnect ${c.name}?`}>
            <p>Disconnect {c.name}? Syncing stops and orders can’t be sent through the connection.</p>
            <div className={styles.row}>
              <button type="button" className={styles.danger} onClick={() => { setConfirming(false); setNote(NOT_YET) }}>Disconnect</button>
              <button type="button" className={styles.textAction} onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className={styles.row}>
            <button type="button" className={styles.outlined} onClick={() => setNote(NOT_YET)}>Test connection</button>
            <button type="button" className={styles.outlined} onClick={onReconnect}>Reconnect</button>
            <button type="button" className={styles.dangerText} onClick={() => { setNote(null); setConfirming(true) }}>Disconnect</button>
          </div>
        )}
        {note && <p className={styles.note} role="status">{note}</p>}
      </div>
    </>
  )
}

/**
 * Setup, in the provider's own terms: what it takes, where to get it, then
 * one field. The method comes from the provider (an HLC token, a Lightspeed
 * sign-in); nothing assumes OAuth.
 */
function Setup({ c, reconnecting, onCancel }: { c: ConnectionView; reconnecting: boolean; onCancel?: () => void }) {
  const [value, setValue] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const fieldId = useId()
  const hintId = useId()
  const oauth = c.method === 'oauth'
  return (
    <>
      {!reconnecting && (
        <Block title="What you’ll get">
          <DataAccess c={c} />
        </Block>
      )}
      <Block title={reconnecting ? `Reconnect ${c.name}` : 'How to connect'}>
        <ol className={styles.steps}>
          {c.setup.steps.map((s, i) => <li key={i}><span className={styles.stepNo} aria-hidden="true">{i + 1}</span><span>{s}</span></li>)}
        </ol>
      </Block>
      <form className={styles.setupForm} onSubmit={(e) => { e.preventDefault(); setValue(''); setNote(NOT_YET) }}>
        {c.setup.field && (
          <div className={styles.field}>
            <label htmlFor={fieldId}>{c.setup.field.label}</label>
            {/* Held only in this form, cleared on submit, never stored or sent. */}
            <input id={fieldId} aria-describedby={hintId} value={value} onChange={(e) => setValue(e.target.value)}
              type={c.method === 'api_token' ? 'password' : 'text'} autoComplete="off" spellCheck={false} />
            <p id={hintId} className={styles.muted}>{c.setup.field.hint}</p>
          </div>
        )}
        <div className={styles.row}>
          <button type="submit" className={styles.outlined} disabled={!!c.setup.field && !value.trim()}>
            {oauth ? `Continue to ${c.name}` : c.setup.field ? 'Test and connect' : 'Start setup'}
          </button>
          {onCancel && <button type="button" className={styles.textAction} onClick={onCancel}>Cancel</button>}
        </div>
        {note && <p className={styles.note} role="status">{note}</p>}
      </form>
    </>
  )
}

function Body({ c }: { c: ConnectionView }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [reconnecting, setReconnecting] = useState(false)
  const connected = isConnected(c)
  const base = useId()
  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label={`${c.name} connection`}>
        {tabs.map((t) => (
          <button key={t.id} id={`${base}-${t.id}`} type="button" role="tab" className={styles.tab}
            aria-selected={tab === t.id} aria-controls={`${base}-panel`} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              const i = tabs.findIndex((x) => x.id === tab)
              const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!
              setTab(next.id)
              document.getElementById(`${base}-${next.id}`)?.focus()
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-${tab}`} className={styles.scroll}>
        {tab === 'overview' && (connected && !reconnecting
          ? <ConnectedOverview c={c} onReconnect={() => setReconnecting(true)} />
          : <Setup c={c} reconnecting={reconnecting} onCancel={reconnecting ? () => setReconnecting(false) : undefined} />)}
        {tab === 'settings' && (
          <p className={styles.muted}>
            {connected
              ? `Which locations use your ${c.name} account, and how often we sync, will be set here.`
              : `Settings appear once ${c.name} is connected.`}
          </p>
        )}
        {tab === 'history' && (connected ? (
          <>
            <dl className={styles.rows}>
              {c.lastSync && <div><dt>Last sync</dt><dd>{c.lastSync}</dd></div>}
              {c.nextSync && <div><dt>Next sync</dt><dd>{c.nextSync}</dd></div>}
            </dl>
            <p className={styles.muted}>A full history of each sync, and anything it couldn’t read, will show here.</p>
          </>
        ) : <p className={styles.muted}>Nothing has synced yet.</p>)}
      </div>
    </>
  )
}

/**
 * One standard panel for every connection: a right-side drawer on desktop,
 * a full-screen sheet on phones. A native <dialog> gives focus trapping,
 * Escape to close and focus return.
 */
export function ConnectionPanel({ connection, onClose }: { connection: ConnectionView | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (connection && !d.open) d.showModal()
    if (!connection && d.open) d.close()
  }, [connection])

  return (
    <dialog ref={dialog} className={styles.panel} aria-labelledby="connection-title" onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) dialog.current?.close() }}>
      {connection && (
        <>
          <header className={styles.panelHead}>
            <LogoTile connection={connection} size={48} />
            <div className={styles.panelName}>
              <h2 id="connection-title" className={styles.panelTitle} tabIndex={-1} autoFocus>{connection.name}</h2>
              <p className={styles.panelMeta}>
                <span>{kindLabel[connection.kind]}</span>
                <Status status={connection.status} />
              </p>
            </div>
            <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}>
              <Icon name="close" />
            </button>
          </header>
          <Body key={connection.id} c={connection} />
        </>
      )}
    </dialog>
  )
}
