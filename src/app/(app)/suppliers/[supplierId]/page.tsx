import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoProgramFit, findDemoSupplier } from '@/demo/suppliers'
import { getSupplier } from '@/domain/suppliers/directory'
import { SupplierProfile } from '@/features/suppliers/SupplierProfile'
import { requireOrganization } from '@/server/session'
import { Page } from '@/ui/Layout'

type Params = { params: Promise<{ supplierId: string }> }

async function load(supplierId: string) {
  if (supplierId.startsWith('demo-')) {
    if (!isDemoPreviewEnabled()) return null
    const demo = findDemoSupplier(supplierId)
    return demo ? { presentation: demo.presentation, relationship: demo.relationship, programFit: demoProgramFit(supplierId), example: true } : null
  }
  if (!z.uuid().safeParse(supplierId).success) return null
  const { db, organization } = await requireOrganization()
  const found = await getSupplier(db, organization.id, supplierId)
  // No real Program fit yet: it needs the retailer's own history (docs/programs.md).
  return found ? { ...found, programFit: {}, example: false } : null
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { supplierId } = await params
  const found = await load(supplierId)
  return { title: found?.presentation.identity.name ?? 'Supplier' }
}

export default async function SupplierPage({ params }: Params) {
  const { organization } = await requireOrganization()
  const { supplierId } = await params
  const found = await load(supplierId)
  if (!found) notFound()
  return (
    <Page>
      <SupplierProfile presentation={found.presentation} relationship={found.relationship}
        retailerName={organization.name} programFit={found.programFit} example={found.example} />
    </Page>
  )
}
