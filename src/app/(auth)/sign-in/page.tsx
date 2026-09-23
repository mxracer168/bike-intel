import type { Metadata } from 'next'
import { SignInForm } from '@/forms/SignInForm'
import { Notice } from '@/ui/Feedback'
import { PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Sign in' }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams
  return (
    <>
      <PageHeader title="Welcome back." lead="Sign in to see what needs your attention." />
      {notice === 'link-expired' && (
        <Notice tone="consider" title="That link has expired or was already used.">
          <p>Sign in below, or create your account again to get a new link.</p>
        </Notice>
      )}
      <SignInForm />
    </>
  )
}
