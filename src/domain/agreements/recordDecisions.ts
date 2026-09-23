import { agreements } from '@/content/agreements'
import type { Db } from '@/lib/supabase/types'
import { DomainError } from '@/domain/validation'

export type IndustryIntelligenceDecision = 'accepted' | 'declined'

/**
 * Records platform-terms acceptance and the industry-intelligence choice as
 * two separate, append-only decisions. presentationId links decisions shown
 * together. Written as the signed-in user; the database requires an owner or
 * admin deciding for themselves.
 */
export async function recordAgreementDecisions(
  db: Db,
  params: {
    organizationId: string
    userId: string
    presentationId: string
    platformTermsAccepted: true
    industryIntelligence: IndustryIntelligenceDecision
    context: string
  },
) {
  const decidedAt = new Date().toISOString()
  const common = {
    organization_id: params.organizationId,
    decided_by: params.userId,
    decided_at: decidedAt,
    presentation_id: params.presentationId,
    context: params.context,
  }
  const { error } = await db.from('organization_agreement').insert([
    { ...common, agreement_type: agreements.platformTerms.type, agreement_version: agreements.platformTerms.version, decision: 'accepted' },
    {
      ...common,
      agreement_type: agreements.industryIntelligence.type,
      agreement_version: agreements.industryIntelligence.version,
      decision: params.industryIntelligence,
    },
  ])
  if (error) throw new DomainError('We couldn’t record your choices. Please try again.')
}
