import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

type StyleProps = { variant?: ButtonVariant; size?: 'md' | 'sm'; fullWidth?: boolean }

export function buttonClassName({ variant = 'secondary', size = 'md', fullWidth = false }: StyleProps, extra?: string) {
  return [styles.button, styles[variant], size === 'sm' && styles.sm, fullWidth && styles.full, extra]
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { pending?: boolean }

/** One primary button per screen; everything else secondary or quiet. */
export function Button({ variant, size, fullWidth, pending = false, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth }, [pending && styles.pending, className].filter(Boolean).join(' '))}
      aria-busy={pending || undefined}
      {...rest}
    >
      {children}
    </button>
  )
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps

export function ButtonLink({ variant, size, fullWidth, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClassName({ variant, size, fullWidth }, className)} {...rest} />
}
