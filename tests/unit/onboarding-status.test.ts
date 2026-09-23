import { describe, expect, it } from 'vitest'
import { computeOnboardingStatus, type OnboardingFacts } from '@/domain/onboarding/status'

const done: OnboardingFacts = {
  hasOrganization: true, hasCountry: true, locationCount: 1, platformTermsAccepted: true, industryIntelligenceDecided: true,
}

describe('computeOnboardingStatus', () => {
  it('starts with the business when nothing exists', () => {
    const s = computeOnboardingStatus({ ...done, hasOrganization: false, hasCountry: false, locationCount: 0, platformTermsAccepted: false, industryIntelligenceDecided: false })
    expect(s.complete).toBe(false)
    expect(s.nextStep).toBe('business')
    expect(s.missing).toEqual(['organization', 'location', 'platform_terms', 'industry_intelligence'])
  })

  it('asks for a location once the business exists', () => {
    expect(computeOnboardingStatus({ ...done, locationCount: 0 }).nextStep).toBe('location')
  })

  it('returns to the business step when the country is missing', () => {
    expect(computeOnboardingStatus({ ...done, hasCountry: false }).nextStep).toBe('business')
  })

  it('requires platform terms to be accepted', () => {
    const s = computeOnboardingStatus({ ...done, platformTermsAccepted: false })
    expect(s).toEqual({ complete: false, missing: ['platform_terms'], nextStep: 'agreements' })
  })

  it('treats either industry-intelligence answer as a decision', () => {
    expect(computeOnboardingStatus({ ...done, industryIntelligenceDecided: false }).missing).toEqual(['industry_intelligence'])
  })

  it('is complete when every fact is present', () => {
    expect(computeOnboardingStatus(done)).toEqual({ complete: true, missing: [], nextStep: null })
  })
})
