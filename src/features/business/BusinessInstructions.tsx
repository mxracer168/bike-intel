'use client'

import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { useMemo, useState, useTransition } from 'react'
import { EMPTY_DOC, type InstructionsDoc } from '@/domain/instructions/document'
import { instructionExtensions } from '@/domain/instructions/extensions'
import type { BusinessInstructions as Instructions } from '@/domain/instructions/read'
import { saveBusinessInstructionsAction } from '@/server/actions/businessInstructions'
import { Icon } from '@/ui/Icon'
import { InstructionsContent } from './InstructionsContent'
import styles from './Business.module.css'

const updated = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso))

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: e.isActive('heading'),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bullets: e.isActive('bulletList'),
      numbers: e.isActive('orderedList'),
    }),
  })
  const tools = [
    { key: 'heading', label: 'Heading', on: state.heading, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), body: <span className={styles.toolText}>Heading</span> },
    { key: 'bold', label: 'Bold', on: state.bold, run: () => editor.chain().focus().toggleBold().run(), body: <b className={styles.toolGlyph}>B</b> },
    { key: 'italic', label: 'Italic', on: state.italic, run: () => editor.chain().focus().toggleItalic().run(), body: <i className={styles.toolGlyph}>I</i> },
    { key: 'bullets', label: 'Bulleted list', on: state.bullets, run: () => editor.chain().focus().toggleBulletList().run(), body: <Icon name="list-bullet" /> },
    { key: 'numbers', label: 'Numbered list', on: state.numbers, run: () => editor.chain().focus().toggleOrderedList().run(), body: <Icon name="list-number" /> },
  ]
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      {tools.map((t) => (
        <button key={t.key} type="button" className={styles.tool} aria-label={t.label} title={t.label} aria-pressed={t.on}
          onMouseDown={(e) => e.preventDefault()} onClick={t.run}>
          {t.body}
        </button>
      ))}
    </div>
  )
}

/** Editing: a plain writing surface with basic formatting, then Save or Cancel. */
function InstructionsEditor({ initial, basedOn, onDone }: { initial: InstructionsDoc; basedOn: number | null; onDone: () => void }) {
  const [problem, setProblem] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const extensions = useMemo(() => [
    ...instructionExtensions,
    Placeholder.configure({ placeholder: 'Write or paste guidance about your business…' }),
  ], [])
  const editor = useEditor({
    extensions,
    content: initial,
    immediatelyRender: false,
    autofocus: 'end',
    editorProps: {
      // Pasted titles keep their weight: H1 becomes a heading, H4-H6 a subheading.
      transformPastedHTML: (html) => html.replace(/<(\/?)h1\b/gi, '<$1h2').replace(/<(\/?)h[4-6]\b/gi, '<$1h3'),
      attributes: { class: styles.editorSurface!, 'aria-label': 'Business instructions', 'aria-multiline': 'true', role: 'textbox' },
    },
  })
  const dirty = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? JSON.stringify(e.getJSON()) !== JSON.stringify(initial) : false),
  })

  function save() {
    if (!editor || pending) return
    if (!dirty) return onDone()
    setProblem(null)
    const document = JSON.stringify(editor.getJSON())
    start(async () => {
      const result = await saveBusinessInstructionsAction(document, basedOn)
      if (result.ok) onDone()
      else setProblem(result.message)
    })
  }

  return (
    <form className={styles.instructionsForm} onSubmit={(e) => { e.preventDefault(); save() }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save() }
        if (e.key === 'Escape' && !dirty) onDone()
      }}>
      <div className={styles.editorFrame}>
        {editor && <Toolbar editor={editor} />}
        <EditorContent editor={editor} className={styles.prose} />
      </div>
      {problem && <p className={styles.saveError} role="alert">{problem}</p>}
      <div className={styles.editorButtons}>
        <button type="submit" className={styles.saveButton} disabled={pending || !editor}>{pending ? 'Saving…' : 'Save'}</button>
        <button type="button" className={styles.quietButton} onClick={onDone} disabled={pending}>Cancel</button>
      </div>
    </form>
  )
}

/**
 * Business instructions: one long-form document of the retailer's own
 * guidance, the most authoritative thing we know about the business. Owners
 * and admins edit it; everyone else reads it. Every save is a new version.
 * See docs/business-instructions.md.
 */
export function BusinessInstructions({ instructions, canEdit }: { instructions: Instructions; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const empty = instructions.isEmpty || !instructions.content

  return (
    <section className={styles.group} aria-labelledby="business-instructions">
      <div className={styles.instructionsHead}>
        <div className={styles.knowHead}>
          <h2 id="business-instructions" className={styles.knowTitle}>Business instructions</h2>
          <p className={styles.small}>Guidance about your business that we always consider when making recommendations.</p>
        </div>
        {canEdit && !editing && !empty && (
          <button type="button" className={styles.editButton} onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {editing ? (
        <InstructionsEditor initial={instructions.content ?? EMPTY_DOC} basedOn={instructions.version} onDone={() => setEditing(false)} />
      ) : empty ? (
        <div className={styles.instructionsEmpty}>
          <p>{canEdit
            ? 'No instructions yet. Write what you always want us to keep in mind, like what you sell, who you buy from and how you order.'
            : 'No instructions yet.'}</p>
          {canEdit && (
            <button type="button" className={styles.writeButton} onClick={() => setEditing(true)}>Write instructions</button>
          )}
        </div>
      ) : (
        <div className={styles.instructionsBody}>
          <div className={styles.prose}><InstructionsContent doc={instructions.content!} /></div>
          {instructions.updatedAt && <p className={styles.updated}>Updated {updated(instructions.updatedAt)}</p>}
        </div>
      )}
    </section>
  )
}
