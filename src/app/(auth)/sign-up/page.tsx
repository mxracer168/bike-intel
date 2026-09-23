import type { Metadata } from 'next'
import { SignUpForm } from '@/forms/SignUpForm'
import { PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Create your account' }

export default function SignUpPage() {
  return (
    <>
      <PageHeader title="Let’s get you set up." lead="Create your account, then tell us a little about your business. It takes a few minutes." />
      <SignUpForm />
    </>
  )
}
