import { getSchema, type JSONContent } from '@tiptap/core'
import { Node as PmNode } from '@tiptap/pm/model'
import { instructionExtensions } from './extensions'

/** Tiptap/ProseMirror JSON: the authoritative, human-authored document. */
export type InstructionsDoc = JSONContent & { type: 'doc' }

export const MAX_TEXT = 50000
export const EMPTY_DOC: InstructionsDoc = { type: 'doc', content: [{ type: 'paragraph' }] }

const schema = getSchema(instructionExtensions)

/**
 * Checks a document against the allowed formatting and returns it with its
 * plain-text form. Throws if it isn't a valid instructions document.
 */
export function parseInstructions(json: unknown): { content: InstructionsDoc; text: string } {
  const node = PmNode.fromJSON(schema, json)
  node.check()
  if (node.type.name !== 'doc') throw new Error('Not a document')
  const text = toPlainText(node)
  if (text.length > MAX_TEXT) throw new Error('Too long')
  // Plain JSON: ProseMirror builds attributes as prototype-less objects.
  return { content: JSON.parse(JSON.stringify(node.toJSON())) as InstructionsDoc, text }
}

/**
 * The DERIVED plain-text form, for retrieval: headings and paragraphs as
 * lines, lists as "- " and "1. " with nested items indented. Formatting marks
 * are dropped. Never edited on its own.
 */
export function toPlainText(doc: PmNode): string {
  const blocks: string[] = []
  const inline = (n: PmNode) => {
    let out = ''
    n.forEach((c) => { out += c.isText ? c.text ?? '' : c.type.name === 'hardBreak' ? '\n' : inline(c) })
    return out
  }
  const walk = (n: PmNode, indent: string) => {
    n.forEach((child) => {
      const name = child.type.name
      if (name === 'paragraph' || name === 'heading') {
        const line = inline(child).trim()
        if (line) blocks.push(indent + line)
      } else if (name === 'bulletList' || name === 'orderedList') {
        let i = (child.attrs.start as number | undefined) ?? 1
        child.forEach((item) => {
          const marker = name === 'bulletList' ? '- ' : `${i++}. `
          const before = blocks.length
          walk(item, indent + ' '.repeat(marker.length))
          if (blocks.length > before) blocks[before] = indent + marker + blocks[before]!.slice(indent.length + marker.length)
        })
      } else {
        walk(child, indent)
      }
    })
  }
  walk(doc, '')
  return blocks.join('\n')
}
