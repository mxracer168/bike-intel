import { describe, expect, it } from 'vitest'
import { demoPrograms, findDemoProgram } from '@/demo/programs'
import { demoProgramFit } from '@/demo/suppliers'
import { termFrom } from '@/domain/programs/programs'
import { byFit, feedbackMessage, formatDay, formatWindow, mailtoHref, pickVersion } from '@/features/programs/format'

describe('program dates', () => {
  it('formats a closing day and delivery windows', () => {
    expect(formatDay('2026-10-15')).toBe('October 15')
    expect(formatWindow('2027-01-05', '2027-03-20')).toBe('January–March')
    expect(formatWindow('2027-02-01', '2027-02-28')).toBe('February')
    expect(formatWindow('2026-12-01', '2027-02-01')).toBe('December 2026–February 2027')
    expect(formatWindow(null, '2027-04-01')).toBe('April')
    expect(formatWindow(null, null)).toBeUndefined()
  })
})

describe('pickVersion', () => {
  it('prefers the newest confirmed version, then the newest draft, never a superseded one', () => {
    expect(pickVersion([
      { version_number: 1, status: 'superseded' }, { version_number: 2, status: 'confirmed' }, { version_number: 3, status: 'draft' },
    ])?.version_number).toBe(2)
    expect(pickVersion([{ version_number: 1, status: 'draft' }, { version_number: 2, status: 'draft' }])?.version_number).toBe(2)
    expect(pickVersion([{ version_number: 1, status: 'superseded' }])).toBeUndefined()
  })
})

describe('Programs list order', () => {
  it('puts the best fit first and programs without a fit last', () => {
    const fit = (score: number) => ({ score, factors: [] })
    const list = [{ name: 'B' }, { name: 'C', fit: fit(2.1) }, { name: 'A' }, { name: 'D', fit: fit(4.6) }].sort(byFit)
    expect(list.map((p) => p.name)).toEqual(['D', 'C', 'A', 'B'])
  })

  it('shows the demo programs with the same fit as their supplier pages', () => {
    expect(demoPrograms.map((p) => p.fit?.score)).toEqual([4.6, 4.2, 3.2, 2.1])
    const winter = findDemoProgram('demo-northline-winter-service')
    expect(winter?.fit).toEqual(demoProgramFit('demo-northline')['Winter service parts program'])
    expect(winter?.rep?.email).toBe('jordan.ellis@example.com')
  })
})

describe('feedback for the rep', () => {
  const asks = [
    { title: 'Lower the minimum', request: 'Reduce the commitment from 18 bikes to 10.', impact: 'x' },
    { title: 'Move delivery to March', request: 'Ship in March instead of January.', impact: 'y' },
  ]

  it('writes a plain message with each request and the note', () => {
    const m = feedbackMessage({ programName: 'Spring booking', retailerName: 'Summit Cycles', repName: 'Jordan Ellis', asks, note: '  We could take more with exchanges. ' })
    expect(m.subject).toBe('Spring booking: feedback from Summit Cycles')
    expect(m.body).toContain('Hi Jordan,')
    expect(m.body).toContain('2 changes would make it a stronger fit for Summit Cycles')
    expect(m.body).toContain('1. Lower the minimum: Reduce the commitment from 18 bikes to 10.')
    expect(m.body).toContain('\n\nWe could take more with exchanges.\n')
    expect(m.body.endsWith('Thanks,\nSummit Cycles')).toBe(true)
  })

  it('greets anyone when there is no rep, and opens an email with or without an address', () => {
    const m = feedbackMessage({ programName: 'P', retailerName: 'R', asks: asks.slice(0, 1), note: '' })
    expect(m.body).toContain('Hi there,')
    expect(m.body).toContain('One change would')
    expect(mailtoHref('jordan.ellis@example.com', m)).toMatch(/^mailto:jordan\.ellis@example\.com\?subject=P%3A%20feedback%20from%20R&body=Hi%20there/)
    expect(mailtoHref(undefined, m)).toMatch(/^mailto:\?subject=/)
  })
})

describe('termFrom', () => {
  const base = { rule_type: 'benefit', tier_label: null, threshold_type: null, threshold_value: null, threshold_currency: null, benefit_type: null, benefit_value: null, source_text: null }

  it('keeps the supplier’s own wording', () => {
    expect(termFrom({ ...base, tier_label: 'Tier 2', source_text: ' 10% off at 48 tires ' })).toEqual({ label: 'Tier 2', detail: '10% off at 48 tires' })
  })

  it('describes a rule from its parts, or skips an empty one', () => {
    expect(termFrom({ ...base, benefit_type: 'percent_discount', benefit_value: 8, threshold_type: 'quantity', threshold_value: 24 }))
      .toEqual({ label: 'Benefit', detail: '8% off at 24 units or more' })
    expect(termFrom(base)).toBeNull()
  })
})
