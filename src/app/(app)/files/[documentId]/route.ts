import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganization } from '@/server/session'

/**
 * Opens one of the retailer's own files. The document row is read as the
 * signed-in user (row-level security), so a file from another retailer is
 * simply not found; the link handed out expires after a minute.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  const id = z.uuid().safeParse(documentId)
  if (!id.success) return new NextResponse('Not found', { status: 404 })

  const { db, organization } = await requireOrganization()
  const { data: doc } = await db
    .from('document')
    .select('storage_bucket, storage_path, file_name')
    .eq('id', id.data)
    .eq('organization_id', organization.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!doc) return new NextResponse('Not found', { status: 404 })

  const { data } = await db.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 60, { download: doc.file_name })
  if (!data?.signedUrl) return new NextResponse('Not found', { status: 404 })
  return NextResponse.redirect(data.signedUrl, { headers: { 'Cache-Control': 'no-store' } })
}
