/**
 * Agreement versions and wording shown at onboarding.
 * PLACEHOLDER COPY: final legal wording is not decided. Bump the version
 * whenever the wording changes; each decision records the version shown.
 */
export const agreements = {
  platformTerms: {
    type: 'platform_terms',
    version: '2026-09-draft',
    title: 'Platform terms',
    summary:
      'How we handle your account and your business data. Your sales, costs, inventory and plans stay private to your business.',
    checkboxLabel: 'I agree to the platform terms.',
    required: 'Please agree to the platform terms to continue.',
  },
  industryIntelligence: {
    type: 'industry_intelligence',
    version: '2026-09-draft',
    title: 'Help improve buying advice across the industry',
    summary:
      'You can let us include your data, combined and anonymized with other retailers, to learn patterns like seasonality and product demand. No one can identify your business from it. This is your choice and does not change your service.',
    question: 'Include my business in anonymized industry insights?',
    options: [
      { value: 'accepted', label: 'Yes, include my business' },
      { value: 'declined', label: 'No, keep it out' },
    ],
    required: 'Choose yes or no to continue.',
  },
} as const
