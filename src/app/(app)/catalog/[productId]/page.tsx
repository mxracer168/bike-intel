import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { demoOrderContexts, demoSupplierName, findDemoProduct } from '@/demo/catalog'
import { isDemoPreviewEnabled } from '@/demo/config'
import { ProductDetail } from '@/features/catalog/ProductDetail'
import { requireOrganization } from '@/server/session'
import { Page } from '@/ui/Layout'

type Params = { params: Promise<{ productId: string }>; searchParams: Promise<{ option?: string | string[]; supplier?: string | string[] }> }

const load = (id: string) => (isDemoPreviewEnabled() ? findDemoProduct(decodeURIComponent(id)) : null)

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = load((await params).productId)
  return { title: product?.name ?? 'Product' }
}

/** One catalog product and its options. Example data only until the catalog is imported. */
export default async function ProductPage({ params, searchParams }: Params) {
  await requireOrganization()
  const product = load((await params).productId)
  if (!product) notFound()
  const { option, supplier } = await searchParams
  const supplierName = typeof supplier === 'string' ? demoSupplierName(supplier) : null
  return (
    <Page>
      <ProductDetail product={product} orders={demoOrderContexts()} initialOption={typeof option === 'string' ? option : undefined}
        backHref={supplierName ? `/catalog?supplier=${encodeURIComponent(supplier as string)}` : '/catalog'}
        backLabel={supplierName ? `${supplierName} Catalog` : 'Catalog'} />
    </Page>
  )
}
