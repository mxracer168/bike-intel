import { describe, expect, it } from 'vitest'
import { MAX_QUESTIONS, topQuestions, type ContextQuestion } from '@/features/context/types'
import type { OrderSummary } from '@/features/orders/types'
import { orderPriority } from '@/features/work/fromOrder'

const q = (id: string): ContextQuestion => ({ id, prompt: id, choices: ['Yes', 'No'] })

describe('context questions', () => {
  it('never shows more than three, keeping the given order', () => {
    expect(MAX_QUESTIONS).toBe(3)
    expect(topQuestions(['a', 'b', 'c', 'd', 'e'].map(q)).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('shows none when there are none, and never pads', () => {
    expect(topQuestions([])).toEqual([])
    expect(topQuestions([q('a')])).toHaveLength(1)
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
