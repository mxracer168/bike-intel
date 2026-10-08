import { describe, expect, it } from 'vitest'
import { papaWheelies as script } from '@/demo/onboarding'
import { callState, openingLine } from '@/features/onboarding-call/script'

describe('onboarding call script', () => {
  it('opens mid-conversation, on buying with suppliers up next, with what was learned so far', () => {
    const s = callState(script, openingLine(script, undefined))
    expect(s.current?.speaker).toBe('advisor')
    expect(s.agenda.map((t) => t.status)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming'])
    expect(s.upNext?.label).toBe('Suppliers')
    expect(s.said.at(-1)?.time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/)
    expect(s.learned.map((k) => k.text)).toContain('Road bikes are not normally stocked')
    expect(s.wrapping).toBe(false)
    expect(s.finished).toBe(false)
  })

  it('asks whether a rule is firm before treating it as one', () => {
    const roadBikes = script.lines.findIndex((l) => /don’t stock road bikes/.test(l.text))
    const followUp = script.lines[roadBikes + 1]!
    expect(followUp.speaker).toBe('advisor')
    expect(followUp.text).toMatch(/firm business decision/)
    // Only the answer to the follow-up makes it a (suggested) rule.
    expect(script.lines[roadBikes]!.learned ?? []).toEqual([])
    expect(script.lines[roadBikes + 2]!.learned?.find((k) => k.kind === 'instruction')?.text).toBe('Road bikes are not normally stocked')
  })

  it('keeps rules, seasonal and one-off context apart', () => {
    const learned = callState(script, script.lines.length).learned
    expect(new Set(learned.map((k) => k.kind))).toEqual(new Set(['instruction', 'context', 'seasonal', 'temporary']))
  })

  it('not everything said becomes intelligence', () => {
    const silent = script.lines.filter((l) => l.speaker === 'retailer' && !l.learned?.length)
    expect(silent.map((l) => l.text)).toContain('Quick question. Can I change any of this later?')
  })

  it('wraps up, then offers the check-in at the end', () => {
    const wrap = callState(script, openingLine(script, 'wrap'))
    expect(wrap.wrapping).toBe(true)
    expect(wrap.agenda.every((t) => t.status === 'done')).toBe(true)
    expect(wrap.upNext).toBeNull()
    expect(wrap.finished).toBe(false)
    expect(callState(script, openingLine(script, 'end')).finished).toBe(true)
  })

  it('stays within the script', () => {
    expect(callState(script, 0).said).toHaveLength(1)
    expect(callState(script, 999).said).toHaveLength(script.lines.length)
  })
})
