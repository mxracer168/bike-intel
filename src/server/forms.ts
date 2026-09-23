import type { FieldErrors } from '@/domain/validation'

/** State returned by server actions to their forms. */
export type FormState = {
  status: 'idle' | 'error'
  errors: FieldErrors
  formError?: string
  values: Record<string, string>
}

export const initialFormState: FormState = { status: 'idle', errors: {}, values: {} }

/** Reads named text fields from a form submission (never passwords into state). */
export function readFields(formData: FormData, names: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const name of names) {
    const v = formData.get(name)
    values[name] = typeof v === 'string' ? v : ''
  }
  return values
}

export function errorState(values: Record<string, string>, errors: FieldErrors, formError?: string): FormState {
  return { status: 'error', errors, formError, values }
}
