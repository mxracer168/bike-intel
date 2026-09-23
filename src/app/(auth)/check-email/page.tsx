import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Check your email' }

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams
  return (
    <>
      <PageHeader
        title="Check your email."
        lead={email ? `We sent a confirmation link to ${email}. Open it on this device to continue.` : 'We sent you a confirmation link. Open it to continue.'}
      />
      <p>Nothing arrived after a few minutes? Check your spam folder, or <Link href="/sign-up">try again</Link>.</p>
    </>
  )
}
