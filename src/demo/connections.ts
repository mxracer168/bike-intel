/**
 * EXAMPLE DATA for the Connections page. Nothing here connects to anything;
 * no credentials exist. Setup steps describe each provider's method as we
 * currently understand it and must be checked against their documentation
 * before building (see docs/connections.md).
 */
import type { ConnectionView } from '@/features/connections/types'

const supplierData = [
  { title: 'Catalog and product data', detail: 'Products, specifications and images' },
  { title: 'Inventory', detail: 'Stock levels and availability' },
  { title: 'Your pricing', detail: 'Dealer pricing and terms for your account' },
]

export function demoConnections(retailerName: string): ConnectionView[] {
  const caller = retailerName.replace(/[^A-Za-z0-9]/g, '') || 'YourStore'
  return [
    {
      id: 'lightspeed', name: 'Lightspeed Retail', kind: 'pos', method: 'oauth', status: 'not_connected',
      description: 'Sync sales, inventory and customer data used by Buying Intelligence.',
      capabilities: [
        { title: 'Sales', detail: 'What sold, where and when' },
        { title: 'Inventory', detail: 'Stock on hand at each location' },
        { title: 'Items', detail: 'Your products, costs and categories' },
        { title: 'Purchase history', detail: 'What you ordered and received' },
      ],
      setup: { steps: ['Sign in to Lightspeed and approve access for Buying Intelligence.', 'Choose which locations to include.', 'We test the connection and start the first sync.'] },
    },
    {
      id: 'shopify', name: 'Shopify', kind: 'pos', method: 'oauth', status: 'not_connected',
      description: 'Sync sales and inventory from your Shopify store.',
      capabilities: [
        { title: 'Sales', detail: 'Online and in-store orders' },
        { title: 'Inventory', detail: 'Stock by location' },
        { title: 'Products', detail: 'Your catalog and variants' },
      ],
      setup: { steps: ['Sign in to Shopify and approve access for Buying Intelligence.', 'We test the connection and start the first sync.'] },
    },
    {
      id: 'hlc', name: 'HLC', kind: 'supplier', method: 'api_token', status: 'connected', logo: '/logos/hlc.svg',
      description: 'Catalog, inventory, pricing, orders and account data.',
      capabilities: [
        ...supplierData,
        { title: 'Orders', detail: 'Send orders and follow their status' },
        { title: 'Invoices and account data', detail: 'Order history and invoices' },
        { title: 'Shipping addresses', detail: 'Ship-to addresses on your account' },
      ],
      orderSubmission: true,
      lastSync: 'Today at 8:24 AM', nextSync: 'In 56 minutes',
      credentials: [
        { label: 'API access token', value: '••••••••••••7F2A', masked: true },
        { label: 'Application identifier (caller name)', value: caller },
      ],
      setup: {
        steps: [
          'Sign in to your HLC dealer account and create an API access token.',
          'Paste the token here. We store it securely and never show it again.',
          'We test the connection, then start the first sync.',
        ],
        field: { label: 'HLC API access token', hint: 'From your HLC dealer account. Only your business can use it.' },
      },
    },
    {
      id: 'northline', name: 'Northline Distribution', kind: 'supplier', method: 'api', status: 'connected',
      description: 'Product data, inventory, dealer pricing and order submission.',
      capabilities: [...supplierData, { title: 'Orders', detail: 'Send orders and follow their status' }],
      orderSubmission: true, lastSync: 'Today at 8:24 AM', nextSync: 'In 56 minutes',
      credentials: [{ label: 'Account number', value: 'PW-18472' }],
      supplierHref: '/suppliers/demo-northline',
      setup: { steps: ['Enter your Northline account number.', 'Approve the request Northline sends to your account email.', 'We test the connection and start the first sync.'], field: { label: 'Northline account number', hint: 'Printed on your Northline invoices.' } },
    },
    {
      id: 'qbp', name: 'Quality Bicycle Products', kind: 'supplier', method: 'api_token', status: 'attention',
      description: 'Product data, inventory and order submission.',
      attention: 'The access token stopped working on September 22. Reconnect to resume syncing.',
      capabilities: [...supplierData.slice(0, 2), { title: 'Orders', detail: 'Send orders and follow their status' }],
      orderSubmission: true, lastSync: 'September 22 at 6:10 AM',
      credentials: [{ label: 'API access token', value: '••••••••••••91C0', masked: true }],
      setup: { steps: ['Sign in to your QBP account and create a new API token.', 'Paste it here.', 'We test the connection and resume syncing.'], field: { label: 'QBP API token', hint: 'From your QBP account settings.' } },
    },
    {
      id: 'jbi', name: 'JBI', kind: 'supplier', method: 'file', status: 'not_connected',
      description: 'Product data, inventory and dealer pricing.',
      capabilities: supplierData,
      setup: { steps: ['Ask your JBI rep to enable price and stock files for your account.', 'We’ll give you an address to send them to.', 'We check the first file and keep it updated from then on.'] },
    },
    {
      id: 'shimano', name: 'Shimano', kind: 'supplier', method: 'manual', status: 'not_connected',
      description: 'Product data, inventory and dealer pricing.',
      capabilities: supplierData,
      setup: { steps: ['Tell us your Shimano dealer number.', 'We’ll confirm what Shimano can share for your account and guide you from there.'], field: { label: 'Shimano dealer number', hint: 'On your Shimano account statements.' } },
    },
    {
      id: 'sram', name: 'SRAM', kind: 'supplier', method: 'manual', status: 'not_connected',
      description: 'Product data, inventory and dealer pricing.',
      capabilities: supplierData,
      setup: { steps: ['Tell us your SRAM dealer number.', 'We’ll confirm what SRAM can share for your account and guide you from there.'], field: { label: 'SRAM dealer number', hint: 'On your SRAM account statements.' } },
    },
  ]
}
