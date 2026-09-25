import { describe, expect, it } from 'vitest'
import { fitBand, formatFit } from '@/features/suppliers/programFit'

describe('program fit', () => {
  it('bands scores in plain words', () => {
    expect(fitBand(5)).toBe('Exceptional fit')
    expect(fitBand(4.5)).toBe('Exceptional fit')
    expect(fitBand(4.4)).toBe('Strong fit')
    expect(fitBand(4)).toBe('Strong fit')
    expect(fitBand(3.2)).toBe('Worth considering')
    expect(fitBand(2.9)).toBe('Limited fit')
  })
  it('always shows one decimal', () => {
    expect(formatFit(4)).toBe('4.0')
    expect(formatFit(4.6)).toBe('4.6')
  })
})
