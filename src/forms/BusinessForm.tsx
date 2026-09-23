'use client'

import { useActionState } from 'react'
import { supportedCountries } from '@/domain/reference/countries'
import { saveBusinessAction } from '@/server/actions/onboarding'
import { initialFormState } from '@/server/forms'
import { Field, Select, TextInput, describedBy } from '@/ui/Field'
import { FormErrorSummary } from '@/ui/Feedback'
import { SubmitButton } from '@/ui/SubmitButton'
import styles from './forms.module.css'

type Props = {
  /** Present only when creating: makes a repeated submit return the same organization. */
  requestId?: string
  defaults: { name?: string; defaultCountry?: string; legalName?: string; website?: string }
}

export function BusinessForm({ requestId, defaults }: Props) {
  const [state, action] = useActionState(saveBusinessAction, initialFormState)
  const e = state.errors
  const v = state.status === 'error' ? state.values : defaults
  return (
    <form action={action} className={styles.form} noValidate>
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      <FormErrorSummary errors={state.formError ? [state.formError] : []} />
      <Field id="name" label="Business name" help="The name your customers know you by." error={e.name}>
        <TextInput id="name" name="name" autoComplete="organization" required defaultValue={v.name}
          invalid={Boolean(e.name)} aria-describedby={describedBy('name', { help: true, error: e.name })} />
      </Field>
      <Field id="defaultCountry" label="Country" help="Where your business operates. Each location can differ later." error={e.defaultCountry}>
        <Select id="defaultCountry" name="defaultCountry" required defaultValue={v.defaultCountry ?? ''}
          invalid={Boolean(e.defaultCountry)} aria-describedby={describedBy('defaultCountry', { help: true, error: e.defaultCountry })}>
          <option value="" disabled>Choose a country</option>
          {supportedCountries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
      </Field>
      <div className={styles.row}>
        <Field id="legalName" label="Legal business name" optional error={e.legalName}>
          <TextInput id="legalName" name="legalName" defaultValue={v.legalName} invalid={Boolean(e.legalName)}
            aria-describedby={describedBy('legalName', { error: e.legalName })} />
        </Field>
        <Field id="website" label="Website" optional error={e.website}>
          <TextInput id="website" name="website" inputMode="url" autoComplete="url" placeholder="yourshop.com"
            defaultValue={v.website} invalid={Boolean(e.website)} aria-describedby={describedBy('website', { error: e.website })} />
        </Field>
      </div>
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Saving…">Continue</SubmitButton>
      </div>
    </form>
  )
}
