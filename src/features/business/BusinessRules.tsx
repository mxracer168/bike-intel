'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import type { BusinessRule } from '@/domain/rules/list'
import { addBusinessRuleAction, editBusinessRuleAction, stopBusinessRuleAction } from '@/server/actions/businessRules'
import { Icon } from '@/ui/Icon'
import styles from './Business.module.css'

type Save = (text: string) => Promise<{ ok: true } | { ok: false; message: string }>

/** One plain-language box, used to add a rule and to reword one. */
function RuleEditor({ initial = '', label, saveLabel, onSave, onCancel }: {
  initial?: string; label: string; saveLabel: string; onSave: Save; onCancel: () => void
}) {
  const [text, setText] = useState(initial)
  const [problem, setProblem] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const box = useRef<HTMLTextAreaElement>(null)
  const errorId = useId()

  useEffect(() => {
    const el = box.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  function save() {
    if (text.trim() === initial.trim() && initial) return onCancel()
    start(async () => {
      const result = await onSave(text)
      if (result.ok) onCancel()
      else setProblem(result.message)
    })
  }

  return (
    <form className={styles.ruleEditor} onSubmit={(e) => { e.preventDefault(); save() }}>
      <textarea
        ref={box}
        aria-label={label}
        className={styles.ruleInput}
        value={text}
        rows={2}
        maxLength={500}
        placeholder="For example: We do not sell road bikes."
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? errorId : undefined}
        onChange={(e) => { setText(e.target.value); setProblem(null) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
          if (e.key === 'Escape') onCancel()
        }}
      />
      {problem && <p id={errorId} className={styles.ruleError}>{problem}</p>}
      <div className={styles.ruleButtons}>
        <button type="submit" className={styles.ruleSave} disabled={pending || !text.trim()}>{pending ? 'Saving…' : saveLabel}</button>
        <button type="button" className={styles.ruleQuiet} onClick={onCancel} disabled={pending}>Cancel</button>
      </div>
    </form>
  )
}

/**
 * Business rules: decisions the retailer has made that recommendations must
 * respect until they change them. Owners and admins add, reword and stop
 * rules; everyone else sees them. Stopping keeps the rule's history; Undo
 * adds it again. See docs/business-rules.md.
 */
export function BusinessRules({ rules, canManage }: { rules: BusinessRule[]; canManage: boolean }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [stopped, setStopped] = useState<{ statement: string } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function stop(rule: BusinessRule) {
    setProblem(null)
    start(async () => {
      const result = await stopBusinessRuleAction(rule.id)
      if (result.ok) setStopped({ statement: rule.statement })
      else setProblem(result.message)
    })
  }

  function undo() {
    if (!stopped) return
    const { statement } = stopped
    start(async () => {
      const result = await addBusinessRuleAction(statement)
      if (result.ok) setStopped(null)
      else setProblem(result.message)
    })
  }

  const empty = rules.length === 0 && !adding

  return (
    <section className={styles.group} aria-labelledby="business-rules">
      <div className={styles.knowHead}>
        <h2 id="business-rules" className={styles.knowTitle}>Business rules</h2>
        {!empty && <p className={styles.small}>Decisions about your business that we always respect, until you change them.</p>}
      </div>

      {empty && (
        <p className={styles.rulesEmpty}>
          No business rules yet.{canManage && ' Add the decisions you always want us to respect.'}
        </p>
      )}

      {rules.length > 0 && (
        <ul className={styles.rules}>
          {rules.map((r) => (
            <li key={r.id} className={styles.rule}>
              {editing === r.id ? (
                <RuleEditor
                  initial={r.statement}
                  label="Business rule"
                  saveLabel="Save"
                  onSave={(text) => editBusinessRuleAction(r.id, text)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <p className={styles.ruleText}>{r.statement}</p>
                  {canManage && (
                    <div className={styles.ruleActions}>
                      <button type="button" className={styles.ruleQuiet} disabled={pending} aria-label={`Edit: ${r.statement}`}
                        onClick={() => { setAdding(false); setStopped(null); setEditing(r.id) }}>
                        Edit
                      </button>
                      <button type="button" className={styles.ruleQuiet} disabled={pending} aria-label={`Stop using: ${r.statement}`} onClick={() => stop(r)}>
                        Stop using
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {stopped && (
        <p className={styles.ruleStatus} role="status">
          No longer using “{stopped.statement}”
          <button type="button" className={styles.ruleUndo} onClick={undo} disabled={pending}>Undo</button>
        </p>
      )}
      {problem && <p className={styles.ruleError} role="alert">{problem}</p>}

      {canManage && (adding ? (
        <div className={rules.length > 0 ? styles.ruleAddOpen : undefined}>
          <RuleEditor
            label="New business rule"
            saveLabel="Add rule"
            onSave={addBusinessRuleAction}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button type="button" className={styles.ruleAdd} onClick={() => { setEditing(null); setStopped(null); setAdding(true) }}>
          <Icon name="plus" size={14} />Add a rule
        </button>
      ))}
    </section>
  )
}
