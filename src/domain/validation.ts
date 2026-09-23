import type { z } from 'zod'

/** Field-keyed, human-readable validation messages. */
export type FieldErrors = Partial<Record<string, string>>

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors }

export function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, value: parsed.data }
  const errors: FieldErrors = {}
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form')
    errors[key] ??= issue.message
  }
  return { ok: false, errors }
}

/** A failure the person can act on, phrased for them. */
export class DomainError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message)
    this.name = 'DomainError'
  }
}
