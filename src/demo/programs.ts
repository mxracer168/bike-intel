/**
 * EXAMPLE programs for the Programs pages: the demo suppliers' own programs
 * (src/demo/suppliers.ts), with the same example Program fit their supplier
 * pages show, plus a hand-written analysis. Never written to the database.
 */
import type { ProgramAnalysis, ProgramDetailView } from '@/features/programs/types'
import { byFit } from '@/features/programs/format'
import { demoProgramFit, demoSuppliers } from './suppliers'

type Extra = { id: string; delivery: string; benefit: string; commitment: string; analysis: ProgramAnalysis }

const extras: Record<string, Extra> = {
  'Winter service parts program': {
    id: 'demo-northline-winter-service',
    delivery: 'December',
    benefit: '$1,180',
    commitment: '$14,800',
    analysis: {
      headline: 'A strong fit, with two terms worth asking about',
      lead: 'You sell these parts all winter, and December delivery lands as service work picks up. A little flexibility on the mix and on payment would make it stronger.',
      figures: [
        { label: 'Estimated benefit', value: '$1,180' },
        { label: 'Commitment', value: '$14,800' },
        { label: 'Payment terms', value: 'Net 30' },
        { label: 'Cash impact', value: 'Low' },
      ],
      favor: [
        { title: 'Reliable winter demand', text: 'Chains, cassettes and brake pads sell steadily from November through February.' },
        { title: 'A real margin gain', text: 'The extra 8% is worth about $1,180 against your normal Northline terms.' },
        { title: 'Good timing', text: 'December delivery arrives just before your service weeks build.' },
      ],
      risks: [
        { title: 'Mix fixed at booking', text: 'Sizes and speeds are locked in before you see this winter’s repairs.' },
        { title: 'Some overlap with stock', text: 'You already hold about three weeks of chains and cassettes.' },
      ],
      asks: [
        { title: 'Allow a mid-season mix change', request: 'Permit one exchange of unsold wear parts in January.', impact: 'Keeps the booking matched to the repairs you actually see.' },
        { title: 'Extend payment dating', request: 'Move payment from Net 30 to Net 60.', impact: 'Pays for the parts after the busiest service weeks.' },
      ],
    },
  },
  'Tire pre-season': {
    id: 'demo-northline-tire-preseason',
    delivery: 'February–March',
    benefit: '$640',
    commitment: '$3,900',
    analysis: {
      headline: 'A good fit at the first tier',
      lead: 'Tires sell steadily from March, and the split delivery follows the way your spring builds. At your volume you’d reach the first discount tier, not the deeper ones.',
      figures: [
        { label: 'Estimated benefit', value: '$640' },
        { label: 'Commitment', value: '$3,900' },
        { label: 'Payment terms', value: 'Net 60' },
        { label: 'Cash impact', value: 'Low' },
      ],
      favor: [
        { title: 'Steady demand', text: 'Tires are among your most consistent sellers from March onward.' },
        { title: 'Delivery in two parts', text: 'Half arrives in February and half in March, as your tire sales build.' },
        { title: 'A small commitment', text: '24 tires is well within what you sold last spring.' },
      ],
      risks: [
        { title: 'Modest discount at your volume', text: 'The deeper tiers start at 48 tires, about twice what you’d need.' },
        { title: 'Two slower sizes', text: 'Two of the sizes in the usual mix have sold slowly this year.' },
      ],
      asks: [
        { title: 'Count both deliveries toward the tier', request: 'Measure the tier on the combined booking, not each delivery.', impact: 'Could reach the second tier without buying more.' },
        { title: 'Allow a size swap', request: 'Permit size changes before the March delivery.', impact: 'Avoids carrying the two slower sizes into summer.' },
      ],
    },
  },
  'Complete Bike Early Commitment': {
    id: 'demo-northline-complete-bike',
    delivery: 'January',
    benefit: '$1,960',
    commitment: '$49,000',
    analysis: {
      headline: 'A limited fit for your store right now',
      lead: 'The category sells for you, but 18 bikes in January is more than you usually sell then, and comparable bikes are already in stock.',
      figures: [
        { label: 'Estimated benefit', value: '$1,960' },
        { label: 'Commitment', value: '$49,000' },
        { label: 'Payment terms', value: 'Net 60' },
        { label: 'Cash impact', value: 'High' },
      ],
      favor: [
        { title: 'A relevant category', text: 'The program covers bike categories that already sell in your store.' },
        { title: 'Extra margin', text: 'The additional 4% is worth about $1,960 on the full commitment.' },
      ],
      risks: [
        { title: 'Large commitment', text: '18 bikes is well above what you usually sell from January to March.' },
        { title: 'Early delivery', text: 'January delivery arrives well before your strongest complete-bike months.' },
        { title: 'Bikes already in stock', text: 'Comparable bikes you carry cover much of your expected early-season demand.' },
      ],
      asks: [
        { title: 'Lower the minimum', request: 'Reduce the commitment from 18 bikes to 10.', impact: 'Brings the booking in line with your early-season sales.' },
        { title: 'Move delivery to March', request: 'Ship in March instead of January.', impact: 'Puts the bikes in the store when they start selling.' },
        { title: 'Extend payment dating', request: 'Move payment from Net 60 to Net 120.', impact: 'Pays for the bikes after spring sales begin.' },
      ],
    },
  },
  'Spring 2027 booking': {
    id: 'demo-ridgeline-spring-booking',
    delivery: 'February–April',
    benefit: '$3,240',
    commitment: '$38,400',
    analysis: {
      headline: 'A promising brand, with a commitment worth negotiating',
      lead: 'Trail bikes at this price are your fastest-growing category, but twelve bikes from a brand you haven’t sold before is a large first step.',
      figures: [
        { label: 'Estimated benefit', value: '$3,240' },
        { label: 'Commitment', value: '$38,400' },
        { label: 'Payment terms', value: 'Net 90' },
        { label: 'Cash impact', value: 'Moderate' },
      ],
      favor: [
        { title: 'Growing trail demand', text: 'Trail bikes in this price range have grown fastest for you over the last two seasons.' },
        { title: 'Helpful terms', text: 'Net 90 means paying for most bikes after they have started selling.' },
        { title: 'Protected territory', text: 'Dealers carry the line without a competing shop nearby.' },
      ],
      risks: [
        { title: 'A large first booking', text: 'Twelve bikes is more than you have booked from any single brand before.' },
        { title: 'Overlaps what you carry', text: 'Several models sit close to trail bikes you already stock.' },
      ],
      asks: [
        { title: 'Lower the opening commitment', request: 'Reduce the first booking from 12 bikes to 6.', impact: 'Lets you learn how the brand sells before committing deeply.' },
        { title: 'Allow model and size swaps', request: 'Permit one exchange through April.', impact: 'Reduces the risk in models that overlap your current stock.' },
      ],
    },
  },
}

function build(): ProgramDetailView[] {
  const out: ProgramDetailView[] = []
  for (const s of demoSuppliers) {
    const fits = demoProgramFit(s.entry.id)
    const rep = s.presentation.sections.flatMap((sec) => (sec.type === 'contact' ? sec.people : [])).find((p) => p.role === 'Your sales rep')
    for (const sec of s.presentation.sections) {
      if (sec.type !== 'programs') continue
      for (const p of sec.programs) {
        const x = extras[p.name]
        if (!x) continue
        out.push({
          id: x.id,
          name: p.name,
          supplier: { name: s.entry.name, href: `/suppliers/${s.entry.id}` },
          season: p.season,
          closes: p.closes,
          delivery: x.delivery,
          summary: p.summary,
          fit: fits[p.name],
          benefit: `${x.benefit} estimated benefit`,
          commitment: `${x.commitment} commitment`,
          own: false,
          example: true,
          terms: [],
          confirmed: true,
          analysis: x.analysis,
          rep: rep ? { name: rep.name, email: rep.email } : undefined,
        })
      }
    }
  }
  return out.sort(byFit)
}

export const demoPrograms: ProgramDetailView[] = build()

export function findDemoProgram(id: string): ProgramDetailView | null {
  return demoPrograms.find((p) => p.id === id) ?? null
}

/** One demo supplier's programs, for their supplier page. */
export function demoSupplierPrograms(supplierId: string): ProgramDetailView[] {
  return demoPrograms.filter((p) => p.supplier.href === `/suppliers/${supplierId}`)
}
