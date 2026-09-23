'use client'

import { Button } from '@/ui/Button'
import { Page, PageHeader } from '@/ui/Layout'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page width="narrow">
      <PageHeader title="Something went wrong on our side." lead="Your information is safe. Please try again in a moment." />
      <div><Button variant="primary" onClick={reset}>Try again</Button></div>
    </Page>
  )
}
