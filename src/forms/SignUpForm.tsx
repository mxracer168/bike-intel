'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { MIN_PASSWORD_LENGTH } from '@/domain/auth/password'
import { signUpAction } from '@/server/actions/auth'
import { initialFormState } from '@/server/forms'
import { Field, TextInput, describedBy } from '@/ui/Field'
import { FormErrorSummary } from '@/ui/Feedback'
import { SubmitButton } from '@/ui/SubmitButton'
import styles from './forms.module.css'

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialFormState)
  const e = state.errors
  const passwordHelp = `At least ${MIN_PASSWORD_LENGTH} characters.`
  return (
    <form action={action} className={styles.form} noValidate>
      <FormErrorSummary errors={state.formError ? [state.formError] : []} title={state.formError} />
      <Field id="email" label="Work email" error={e.email}>
        <TextInput id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.values.email} invalid={Boolean(e.email)} aria-describedby={describedBy('email', { error: e.email })} />
      </Field>
      <Field id="password" label="Password" help={passwordHelp} error={e.password}>
        <TextInput id="password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH}
          invalid={Boolean(e.password)} aria-describedby={describedBy('password', { help: passwordHelp, error: e.password })} />
      </Field>
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>
        <p className={styles.aside}>Already have an account? <Link href="/sign-in">Sign in</Link></p>
      </div>
    </form>
  )
}
