'use client'

import { useActionState } from 'react'
import { agreements } from '@/content/agreements'
import { recordAgreementsAction } from '@/server/actions/onboarding'
import { initialFormState } from '@/server/forms'
import { Checkbox, ChoiceGroup } from '@/ui/Field'
import { FormErrorSummary } from '@/ui/Feedback'
import { SubmitButton } from '@/ui/SubmitButton'
import styles from './forms.module.css'

/**
 * Two separate decisions on one screen. They are recorded as two distinct
 * agreement rows sharing a presentationId.
 */
export function AgreementsForm({ presentationId }: { presentationId: string }) {
  const [state, action] = useActionState(recordAgreementsAction, initialFormState)
  const e = state.errors
  const t = agreements.platformTerms
  const ii = agreements.industryIntelligence
  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="presentationId" value={presentationId} />
      <FormErrorSummary errors={state.formError ? [state.formError] : []} title={state.formError} />

      <section className={styles.section} aria-labelledby="terms-title">
        <h2 id="terms-title" className={styles.sectionTitle}>{t.title}</h2>
        <p className={styles.sectionBody}>{t.summary}</p>
        <Checkbox id="platformTerms" name="platformTerms" value="accepted" label={t.checkboxLabel} required
          aria-invalid={e.platformTerms ? true : undefined} />
        {e.platformTerms && <p role="alert" className={styles.fieldError}>{e.platformTerms}</p>}
      </section>

      <hr className={styles.divider} />

      <section className={styles.section} aria-labelledby="ii-title">
        <h2 id="ii-title" className={styles.sectionTitle}>{ii.title}</h2>
        <p className={styles.sectionBody}>{ii.summary}</p>
        <ChoiceGroup name="industryIntelligence" legend={ii.question} options={[...ii.options]}
          defaultValue={state.values.industryIntelligence} error={e.industryIntelligence} />
      </section>

      <div className={styles.actions}>
        <SubmitButton pendingLabel="Saving…">Finish setup</SubmitButton>
      </div>
    </form>
  )
}
