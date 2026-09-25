'use client'

import { useId, useRef, useState } from 'react'
import styles from './Suppliers.module.css'

/** Copies a value (an account number) and says so, briefly. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked: the number is on screen to select by hand.
    }
  }
  return (
    <button type="button" className={styles.copy} onClick={copy} aria-label={copied ? `${label} copied` : `Copy ${label}`}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * "Upload program" from a supplier's page: the file arrives already tagged
 * with this supplier. Reading it (dates, terms, thresholds, delivery windows)
 * isn't built, and the file isn't sent anywhere yet.
 */
export function UploadProgram({ supplierName }: { supplierName: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<string | null>(null)
  const statusId = useId()
  return (
    <div className={styles.upload}>
      <button type="button" className={styles.secondary} aria-describedby={file ? statusId : undefined} onClick={() => input.current?.click()}>
        Upload program
      </button>
      <input ref={input} type="file" hidden accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
        onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
      {file && (
        <p id={statusId} className={styles.uploadStatus} role="status">
          {file} · for {supplierName}. Reading programs isn’t available yet, so it hasn’t been added.
        </p>
      )}
    </div>
  )
}

/** Where the technical setup will live (credentials, order method, sync). Nothing is configurable yet. */
export function ManageConnection() {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={styles.manage}>
      <button type="button" className={styles.linkButton} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        Manage connection
      </button>
      <p id={id} hidden={!open} className={styles.railNote}>
        Credentials, how orders are sent and what syncs will be managed here. Not available yet.
      </p>
    </div>
  )
}
