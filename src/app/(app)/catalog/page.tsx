import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { demoCatalog, demoSupplierName, demoSupplierOrder } from '@/demo/catalog'
import { isDemoPreviewEnabled } from '@/demo/config'
import { formatMoney } from '@/domain/language/plain'
import { CatalogBrowser } from '@/features/catalog/CatalogBrowser'
import { readCatalogState } from '@/features/catalog/url'
import { summarizeOrder } from '@/features/orders/summarize'
import { Placeholder } from '@/features/placeholder/Placeholder'
import { requireOrganization } from '@/server/session'
import { Icon } from '@/ui/Icon'
import { Page } from '@/ui/Layout'
import styles from '@/features/catalog/Catalog.module.css'

export const metadata: Metadata = { title: 'Catalog' }

type SearchParams = Record<string, string | string[] | undefined>

/**
 * The Catalog: every product your suppliers offer, searchable and filterable,
 * or one supplier's (?supplier=). Example data until the catalog migration is
 * applied and a supplier catalog is imported (docs/catalog.md).
 */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireOrganization()
  if (!isDemoPreviewEnabled()) {
    return (
      <Placeholder
        title="No catalog to show yet."
        body="Once a supplier’s catalog is connected, you’ll find their products here, with each option, its cost and availability."
      />
    )
  }
  const params = await searchParams
  const supplier = typeof params.supplier === 'string' ? params.supplier : undefined
  const supplierName = supplier ? demoSupplierName(supplier) : null
  if (supplier && !supplierName) notFound()
  const order = supplier ? demoSupplierOrder(supplier) : null
  const summary = order ? summarizeOrder(order) : null

  return (
    <Page>
      {supplier && <Link href="/catalog" className={styles.back}><Icon name="chevron-left" size={16} />All suppliers</Link>}
      <header className={styles.head}>
        <div className={styles.headText}>
          {supplierName && <p className={styles.headEyebrow}>Supplier catalog</p>}
          <h1 className={styles.headTitle}>{supplierName ? `${supplierName} Catalog` : 'Catalog'}</h1>
          <p className={styles.headLead}>
            {supplierName
              ? `Products available from ${supplierName}, with what each means for your store alongside.`
              : 'Find products across your suppliers, compare their options, and see what each means for your store.'}
          </p>
        </div>
        {order && summary && (
          <Link href={`/orders/${order.id}`} className={styles.orderChip} data-free={summary.freightGap === undefined && order.freeFreightAt !== undefined ? '' : undefined}>
            <span className={styles.orderDot} aria-hidden="true" />
            <span className={styles.orderChipText}>
              <span className={styles.orderChipTitle}>Proposed order · {formatMoney(Math.round(summary.total), summary.currency)}</span>
              <span className={styles.orderChipNote}>
                {summary.freightGap !== undefined
                  ? `${formatMoney(Math.ceil(summary.freightGap), summary.currency)} to free freight`
                  : order.freeFreightAt !== undefined ? 'Ships free' : `${summary.lineCount} products`}
              </span>
            </span>
          </Link>
        )}
      </header>
      <CatalogBrowser products={demoCatalog} initial={readCatalogState(params)} supplierId={supplier} />
    </Page>
  )
}
