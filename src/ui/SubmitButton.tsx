'use client'

import { useFormStatus } from 'react-dom'
import { Button, type ButtonVariant } from './Button'

type Props = { children: React.ReactNode; pendingLabel?: string; variant?: ButtonVariant; fullWidth?: boolean }

/** Submit button that disables itself while its form is submitting. */
export function SubmitButton({ children, pendingLabel, variant = 'primary', fullWidth }: Props) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} fullWidth={fullWidth} pending={pending} disabled={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
