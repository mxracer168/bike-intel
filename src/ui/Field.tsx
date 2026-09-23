import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Icon } from './Icon'
import styles from './Field.module.css'

type FieldProps = {
  id: string
  label: ReactNode
  optional?: boolean
  help?: ReactNode
  error?: string
  children: ReactNode
}

/** Label, control, help and a plain-language error, wired for screen readers. */
export function Field({ id, label, optional, help, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children}
      {help && !error && <p id={`${id}-help`} className={styles.help}>{help}</p>}
      {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
    </div>
  )
}

export function describedBy(id: string, { help, error }: { help?: unknown; error?: string }) {
  return error ? `${id}-error` : help ? `${id}-help` : undefined
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export function TextInput({ invalid, className, ...rest }: TextInputProps) {
  return <input className={[styles.input, className].filter(Boolean).join(' ')} aria-invalid={invalid || undefined} {...rest} />
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <div className={styles.selectWrap}>
      <select className={[styles.input, styles.select, className].filter(Boolean).join(' ')} aria-invalid={invalid || undefined} {...rest}>
        {children}
      </select>
      <Icon name="chevron-down" />
    </div>
  )
}

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }

export function Checkbox({ label, id, ...rest }: CheckboxProps) {
  return (
    <label className={styles.check} htmlFor={id}>
      <input type="checkbox" id={id} {...rest} />
      <span>{label}</span>
    </label>
  )
}

type ChoiceGroupProps = {
  name: string
  legend: ReactNode
  options: { value: string; label: string }[]
  defaultValue?: string
  required?: boolean
  error?: string
}

/** Radio choices rendered as the Visual Direction "choice chips". */
export function ChoiceGroup({ name, legend, options, defaultValue, required, error }: ChoiceGroupProps) {
  return (
    <fieldset className={styles.choices} aria-invalid={error ? true : undefined}>
      <legend className={styles.label}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={styles.choice}>
          <input type="radio" name={name} value={o.value} defaultChecked={defaultValue === o.value} required={required} />
          <span>{o.label}</span>
        </label>
      ))}
      {error && <p className={styles.error}>{error}</p>}
    </fieldset>
  )
}
