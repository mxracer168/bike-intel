import { describe, expect, it } from 'vitest'
import { closer } from '@/features/insights/outcomes'

describe('which plan landed closer to demand', () => {
  it('says whose plan was closer, from the three numbers alone', () => {
    expect(closer({ recommended: 24, approved: 30, demand: 31 })).toEqual({
      verdict: 'Your decision was closer', approved: 'What you approved was 1 unit from demand',
    })
    expect(closer({ recommended: 36, approved: 30, demand: 34 }).verdict).toBe('The recommendation was closer')
    expect(closer({ recommended: 48, approved: 48, demand: 51 }).verdict).toBe('Both were equally close')
  })

  it('says when the approved quantity was exactly right', () => {
    expect(closer({ recommended: 10, approved: 12, demand: 12 }).approved).toBe('What you approved was exactly on demand')
  })
})
