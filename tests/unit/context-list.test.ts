import { describe, expect, it } from 'vitest'
import { listActiveContext } from '@/domain/context/list'
import type { Db } from '@/lib/supabase/types'

const row = {
  id: 'c1', statement: 'Closed the first week of January.', scope_type: 'organization', lifespan: 'seasonal',
  source_type: 'retailer_stated', category: null, confidence: null, expires_at: null, retailer_confirmed_at: null,
}

/** A stand-in for the query builder: answers each select with `respond(columns)`. */
function fakeDb(respond: (columns: string) => { data: unknown; error: unknown }) {
  const selects: string[] = []
  const db = {
    from: () => {
      let columns = ''
      const chain = {
        select: (c: string) => { columns = c; selects.push(c); return chain },
        eq: () => chain,
        order: () => chain,
        overrideTypes: () => chain,
        then: (resolve: (v: unknown) => void) => resolve(respond(columns)),
      }
      return chain
    },
  }
  return { db: db as unknown as Db, selects }
}

describe('listActiveContext', () => {
  it('reads the review date and conversation source when the columns exist', async () => {
    const { db } = fakeDb(() => ({ data: [{ ...row, review_at: '2027-01-01', source_message_id: 'm1', source_document_id: null }], error: null }))
    expect(await listActiveContext(db, 'org')).toEqual([
      expect.objectContaining({ reviewAt: '2027-01-01', fromConversation: true }),
    ])
  })

  it('still loads before the conversation migration adds those columns', async () => {
    const { db, selects } = fakeDb((c) => c.includes('review_at')
      ? { data: null, error: { code: '42703', message: 'column context_item.review_at does not exist' } }
      : { data: [row], error: null })
    const entries = await listActiveContext(db, 'org')
    expect(selects).toHaveLength(2)
    expect(entries).toEqual([expect.objectContaining({ id: 'c1', reviewAt: null, fromConversation: false })])
  })

  it('does not hide other errors', async () => {
    const { db } = fakeDb(() => ({ data: null, error: { code: '42501', message: 'permission denied' } }))
    await expect(listActiveContext(db, 'org')).rejects.toMatchObject({ code: '42501' })
  })
})
