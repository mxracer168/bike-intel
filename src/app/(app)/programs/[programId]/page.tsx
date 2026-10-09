import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { isDemoPreviewEnabled } from '@/demo/config'
import { findDemoProgram } from '@/demo/programs'
import { getProgram } from '@/domain/programs/programs'
import { ProgramDetail } from '@/features/programs/ProgramViews'
import { requireOrganization } from '@/server/session'
import { Page } from '@/ui/Layout'

type Params = { params: Promise<{ programId: string }> }

async function load(programId: string) {
  if (programId.startsWith('demo-')) return isDemoPreviewEnabled() ? findDemoProgram(programId) : null
  if (!z.uuid().safeParse(programId).success) return null
  const { db, organization } = await requireOrganization()
  return getProgram(db, organization.id, programId)
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { programId } = await params
  return { title: (await load(programId))?.name ?? 'Program' }
}

export default async function ProgramPage({ params }: Params) {
  const { organization } = await requireOrganization()
  const { programId } = await params
  const program = await load(programId)
  if (!program) notFound()
  return (
    <Page>
      <ProgramDetail program={program} retailerName={organization.name} />
    </Page>
  )
}
