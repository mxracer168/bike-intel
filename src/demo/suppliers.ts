/**
 * EXAMPLE DATA for the supplier directory preview. Fictional suppliers.
 * Never written to the database. Some pages are rich and some sparse on
 * purpose, to show the page works either way.
 */
import type { DirectoryEntry, RelationshipView, SupplierPresentation } from '@/features/suppliers/presentation'

type DemoSupplier = { entry: DirectoryEntry; presentation: SupplierPresentation; relationship: RelationshipView }

const us = { country: 'US', name: 'United States', currency: 'USD' }
const ca = { country: 'CA', name: 'Canada', currency: 'CAD' }

function supplier(
  id: string, name: string, kind: DirectoryEntry['kind'], tagline: string, markets: typeof us[],
  relationship: RelationshipView, sections: SupplierPresentation['sections'], website?: string,
): DemoSupplier {
  return {
    entry: { id, name, tagline, kind, countries: markets.map((m) => m.country), relationship, example: true },
    presentation: { identity: { id, name, tagline, kind, website, markets }, sections },
    relationship,
  }
}

export const demoSuppliers: DemoSupplier[] = [
  supplier(
    'demo-northline', 'Northline Distribution', 'distributor',
    'Parts, tires and accessories from over 300 brands, shipped next day to most shops.',
    [us, ca], { status: 'claimed', preference: 'preferred' },
    [
      {
        type: 'about',
        paragraphs: [
          'Northline is an independent distributor serving specialty bicycle retailers across the United States and Canada.',
          'Most orders placed by 3 pm ship the same day from one of three warehouses, so the majority of shops receive them the next business day.',
        ],
      },
      {
        type: 'facts',
        title: 'Ordering with Northline',
        items: [
          { label: 'Free freight', value: 'Orders over $300' },
          { label: 'Payment terms', value: 'Net 30' },
          { label: 'Warehouses', value: 'Reno, Chicago, Harrisburg' },
          { label: 'Typical delivery', value: '1–2 business days' },
        ],
      },
      {
        type: 'brands',
        brands: ['Shimano', 'SRAM', 'Maxxis', 'Park Tool', 'Continental', 'Topeak', 'Lezyne', 'Stan’s NoTubes', 'WTB', 'Kenda', 'Pedro’s', 'Bontrager'],
      },
      {
        type: 'programs',
        programs: [
          { name: 'Winter service parts program', season: 'Winter 2026', closes: 'October 31', summary: 'Extra 8% off drivetrain wear parts booked for December delivery.' },
          { name: 'Tire pre-season', season: 'Spring 2027', closes: 'November 15', summary: 'Tiered discounts on 24 or more tires, split across two delivery dates.' },
        ],
      },
      {
        type: 'contact',
        people: [
          { role: 'Your sales rep', name: 'Jordan Ellis', email: 'jordan.ellis@example.com', phone: '(555) 010-4471' },
          { role: 'Customer service', email: 'orders@example.com', phone: '(555) 010-4400' },
        ],
        note: 'Weekdays, 7 am to 6 pm Central.',
      },
    ],
    'https://example.com/northline',
  ),
  supplier(
    'demo-ridgeline', 'Ridgeline Bicycle Co.', 'brand',
    'Trail and all-mountain bikes, designed and tested in the Rockies.',
    [us], { status: 'none' },
    [
      {
        type: 'about',
        paragraphs: [
          'Ridgeline builds trail, enduro and e-MTB bikes for riders who ride most days of the week.',
          'Dealers carry the full line with protected territories and a spring booking program.',
        ],
      },
      {
        type: 'programs',
        title: 'Open programs',
        programs: [
          { name: 'Spring 2027 booking', season: 'Spring 2027', closes: 'October 2', summary: 'Book 12 or more bikes for February–April delivery to earn tiered discounts and extended terms.' },
        ],
      },
      {
        type: 'facts',
        title: 'Working with Ridgeline',
        items: [
          { label: 'Dealer program', value: 'Protected territories' },
          { label: 'Booking terms', value: 'Net 90 on spring bookings' },
        ],
      },
    ],
    'https://example.com/ridgeline',
  ),
  supplier('demo-summit', 'Summit Parts Supply', 'distributor', 'Suspension and dropper posts, with in-house service.', [us],
    { status: 'claimed', preference: 'neutral' },
    [{ type: 'about', paragraphs: ['Summit specializes in suspension parts and offers rebuild service for shops without their own suspension bench.'] }]),
  supplier('demo-cascade', 'Cascade Components', 'distributor', 'Wheels, hubs and small parts for independent shops.', [us, ca],
    { status: 'none' }, []),
  supplier('demo-harbor', 'Harbor Wheelworks', 'brand', 'Hand-built wheels from Portland, Maine.', [us], { status: 'none' },
    [{ type: 'about', paragraphs: ['Harbor Wheelworks builds wheels to order and ships within ten business days.'] }]),
  supplier('demo-alpine', 'Alpine Apparel Co.', 'brand_and_distributor', 'Cycling apparel and outerwear for every season.', [us, ca],
    { status: 'none' }, []),
]

export function findDemoSupplier(id: string) {
  return demoSuppliers.find((s) => s.entry.id === id) ?? null
}
