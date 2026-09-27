import { describe, expect, it } from 'vitest'
import { EMPTY_DOC, parseInstructions } from '@/domain/instructions/document'

const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) })
const p = (...content: unknown[]) => ({ type: 'paragraph', content })
const li = (...content: unknown[]) => ({ type: 'listItem', content })

describe('business instructions document', () => {
  it('keeps the allowed formatting and derives readable plain text', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [t('What we sell')] },
        p(t('We do '), t('not', ['bold']), t(' sell road bikes.')),
        { type: 'bulletList', content: [li(p(t('HLC first when pricing is close'))), li(p(t('Order twice a month')), { type: 'bulletList', content: [li(p(t('1st and 15th')))] })] },
        { type: 'orderedList', attrs: { start: 1 }, content: [li(p(t('Service parts'))), li(p(t('Tires'), { type: 'hardBreak' }, t('in pairs')))] },
      ],
    }
    const { content, text } = parseInstructions(doc)
    expect(content.type).toBe('doc')
    expect(text).toBe([
      'What we sell',
      'We do not sell road bikes.',
      '- HLC first when pricing is close',
      '- Order twice a month',
      '  - 1st and 15th',
      '1. Service parts',
      '2. Tires\nin pairs',
    ].join('\n'))
  })

  it('treats an empty document as empty text', () => {
    expect(parseInstructions(EMPTY_DOC).text).toBe('')
  })

  it('rejects formatting outside the allowed set', () => {
    expect(() => parseInstructions({ type: 'doc', content: [{ type: 'codeBlock', content: [t('x')] }] })).toThrow()
    expect(() => parseInstructions({ type: 'doc', content: [p(t('x', ['link']))] })).toThrow()
  })

  it('rejects anything that is not a document', () => {
    expect(() => parseInstructions({ type: 'paragraph' })).toThrow()
    expect(() => parseInstructions('<p>html</p>')).toThrow()
    expect(() => parseInstructions(null)).toThrow()
  })

  it('rejects text over the limit', () => {
    expect(() => parseInstructions({ type: 'doc', content: [p(t('x'.repeat(50001)))] })).toThrow()
  })
})

describe('the stored document', () => {
  it('is plain JSON all the way down', () => {
    const { content } = parseInstructions({ type: 'doc', content: [{ type: 'orderedList', attrs: { start: 3 }, content: [li(p(t('x')))] }] })
    const plain = (v: unknown): boolean =>
      v === null || typeof v !== 'object' || (Array.isArray(v) ? v.every(plain) : Object.getPrototypeOf(v) === Object.prototype && Object.values(v).every(plain))
    expect(plain(content)).toBe(true)
  })
})
