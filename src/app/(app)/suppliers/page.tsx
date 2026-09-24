import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoSuppliers } from '@/demo/suppliers'
import { listSupplierDirectory } from '@/domain/suppliers/directory'
import { SupplierDirectory } from '@/features/suppliers/SupplierDirectory'
import { requireOrganization } from '@/server/session'
import { EmptyState } from '@/ui/Feedback'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Supplier directory' }

export default async function SupplierDirectoryPage() {
  const { db, organization } = await requireOrganization()
  const real = await listSupplierDirectory(db, organization.id)
  const entries = isDemoPreviewEnabled() ? [...real, ...demoSuppliers.map((s) => s.entry)] : real

  return (
    <Page>
      <PageHeader
        title="Suppliers"
        lead="Your terms and history with each supplier stay private to you."
      />
      {entries.length > 0 ? (
        <SupplierDirectory entries={entries} />
      ) : (
        <EmptyState title="No suppliers in the directory yet.">
          Suppliers will appear here as they join, starting with the distributors bike shops buy from most.
        </EmptyState>
      )}
    </Page>
  )
}
