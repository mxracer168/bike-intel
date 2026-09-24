import { describe, expect, it } from 'vitest'
import type { OrderSummary } from '@/features/orders/types'
import { MAX_QUESTIONS, topQuestions, type IntelligenceQuestionView } from '@/features/intelligence/types'
import { orderPriority } from '@/features/work/fromOrder'

const q = (id: string, status: IntelligenceQuestionView['status'] = 'open'): IntelligenceQuestionView =>
  ({ id, prompt: id, choices: ['Yes', 'No'], status })

describe('intelligence questions', () => {
  it('never asks more than three, keeping the given order', () => {
    expect(MAX_QUESTIONS).toBe(3)
    expect(topQuestions(['a', 'b', 'c', 'd', 'e'].map((id) => q(id))).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('asks none when there are none, and never pads', () => {
    expect(topQuestions([])).toEqual([])
    expect(topQuestions([q('a')])).toHaveLength(1)
  })

  it('does not ask answered or retired questions again; deferred ones roll over', () => {
    expect(topQuestions([q('a', 'answered'), q('b', 'withdrawn'), q('c', 'deferred'), q('d')]).map((x) => x.id)).toEqual(['c', 'd'])
  })
})

describe('an order as a priority', () => {
  const base: OrderSummary = { id: 'n', supplier: 'Northline', currency: 'USD', lineCount: 79, total: 4898.1, confident: 65, review: 7, questions: 0 }

  it('leads with questions for the buyer', () => {
    const p = orderPriority({ ...base, questions: 2 })
    expect(p.title).toBe('Northline’s order has 2 questions for you.')
    expect(p.detail).toBe('79 lines, about $4,898 · 7 worth a look')
    expect(p.action).toEqual({ href: '/orders/n', label: 'Review order' })
  })

  it('then a cutoff, then the free-freight gap', () => {
    expect(orderPriority({ ...base, orderBy: 'Thursday' }).title).toBe('Northline’s order closes Thursday.')
    expect(orderPriority({ ...base, review: 0, freightGap: 79.5 })).toMatchObject({
      title: 'Northline is $80 from free freight.',
      detail: '79 lines, about $4,898 · nothing to check',
    })
  })
})
