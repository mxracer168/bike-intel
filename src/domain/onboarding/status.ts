import type { Db } from '@/lib/supabase/types'
import type { ActiveOrganization } from '@/domain/organization/active'

/**
 * Onboarding is defined by which required facts are still missing, not by
 * form steps. Any front end (forms today, conversation later) fills the same
 * facts through the same domain commands.
 */
export type OnboardingFacts = {
  hasOrganization: boolean
  hasCountry: boolean
  locationCount: number
  platformTermsAccepted: boolean
  industryIntelligenceDecided: boolean
}

export type MissingFact = 'organization' | 'country' | 'location' | 'platform_terms' | 'industry_intelligence'
export type OnboardingStep = 'business' | 'location' | 'agreements'

export type OnboardingStatus = { complete: boolean; missing: MissingFact[]; nextStep: OnboardingStep | null }

const stepFor: Record<MissingFact, OnboardingStep> = {
  organization: 'business',
  country: 'business',
  location: 'location',
  platform_terms: 'agreements',
  industry_intelligence: 'agreements',
}

export function computeOnboardingStatus(facts: OnboardingFacts): OnboardingStatus {
  const missing: MissingFact[] = []
  if (!facts.hasOrganization) missing.push('organization')
  else if (!facts.hasCountry) missing.push('country')
  if (facts.locationCount < 1) missing.push('location')
  if (!facts.platformTermsAccepted) missing.push('platform_terms')
  if (!facts.industryIntelligenceDecided) missing.push('industry_intelligence')
  const first = missing[0]
  return { complete: missing.length === 0, missing, nextStep: first ? stepFor[first] : null }
}

export async function loadOnboardingFacts(db: Db, organization: ActiveOrganization | null): Promise<OnboardingFacts> {
  if (!organization) {
    return { hasOrganization: false, hasCountry: false, locationCount: 0, platformTermsAccepted: false, industryIntelligenceDecided: false }
  }
  const [locations, decisions] = await Promise.all([
    db.from('location').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('status', 'active'),
    db.from('organization_agreement_current').select('agreement_type, decision').eq('organization_id', organization.id),
  ])
  if (locations.error) throw locations.error
  if (decisions.error) throw decisions.error
  const latest = new Map((decisions.data ?? []).map((d) => [d.agreement_type, d.decision]))
  return {
    hasOrganization: true,
    hasCountry: Boolean(organization.defaultCountry),
    locationCount: locations.count ?? 0,
    platformTermsAccepted: latest.get('platform_terms') === 'accepted',
    industryIntelligenceDecided: latest.has('industry_intelligence'),
  }
}
