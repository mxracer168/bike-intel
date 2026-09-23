'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signInAction } from '@/server/actions/auth'
import { initialFormState } from '@/server/forms'
import { Field, TextInput, describedBy } from '@/ui/Field'
import { FormErrorSummary } from '@/ui/Feedback'
import { SubmitButton } from '@/ui/SubmitButton'
import styles from './forms.module.css'

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initialFormState)
  const e = state.errors
  return (
    <form action={action} className={styles.form} noValidate>
      <FormErrorSummary errors={state.formError ? [state.formError] : []} title={state.formError} />
      <Field id="email" label="Email" error={e.email}>
        <TextInput id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.values.email} invalid={Boolean(e.email)} aria-describedby={describedBy('email', { error: e.email })} />
      </Field>
      <Field id="password" label="Password" error={e.password}>
        <TextInput id="password" name="password" type="password" autoComplete="current-password" required
          invalid={Boolean(e.password)} aria-describedby={describedBy('password', { error: e.password })} />
      </Field>
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        <p className={styles.aside}>New here? <Link href="/sign-up">Create an account</Link></p>
      </div>
    </form>
  )
}
