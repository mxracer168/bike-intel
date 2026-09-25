import type { Metadata } from 'next'
import { isDemoPreviewEnabled } from '@/demo/config'
import { demoConnections } from '@/demo/connections'
import { ConnectionsView } from '@/features/connections/ConnectionsView'
import { Placeholder } from '@/features/placeholder/Placeholder'
import { requireOrganization } from '@/server/session'
import { Page, PageHeader } from '@/ui/Layout'

export const metadata: Metadata = { title: 'Connections' }

/**
 * Connections: the point-of-sale systems and suppliers the retailer connects,
 * as one library with one panel. Example data only; nothing connects yet
 * (docs/connections.md).
 */
export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ connection?: string | string[] }> }) {
  if (!isDemoPreviewEnabled()) {
    return (
      <Placeholder
        title="Connections are coming soon."
        body="You’ll connect your point-of-sale system and the suppliers you buy from here."
      />
    )
  }
  const { organization } = await requireOrganization()
  const { connection } = await searchParams
  return (
    <Page>
      <PageHeader title="Connections" lead="Connect the systems and suppliers your business already uses." />
      <ConnectionsView connections={demoConnections(organization.name)} initialOpen={typeof connection === 'string' ? connection : null} />
    </Page>
  )
}
