/**
 * EXAMPLE DATA for the Today work queue and the proposed-order screens.
 * Never written to the database. Suppliers are fictional; products are real
 * product names. Lines are generated deterministically so every load shows
 * the same numbers.
 */
import { average, describeCover, describeWeeklyRate } from '@/domain/language/plain'
import type { Confidence, LineState, OrderLineView, ProposedOrderView } from '@/features/orders/types'

/** Small seeded PRNG (mulberry32): same seed, same example data. */
function random(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Family = { name: string; variants: string[]; cost: number; rate: number; season?: string }

/** Expand product families into catalog entries: one per variant. */
function catalog(families: Family[]) {
  return families.flatMap((f) =>
    (f.variants.length ? f.variants : ['']).map((variant) => ({ ...f, variant: variant || undefined })),
  )
}

type Special = Partial<OrderLineView> & { state: LineState }

type Plan = {
  id: string
  supplier: string
  warehouse: string
  leadTimeDays: number
  coverWeeks: number
  freeFreightAt?: number
  orderBy?: string
  seed: number
  families: Family[]
  /** Lines the buyer should look at, keyed "Product · variant", with their reason. */
  special: Record<string, Special>
}

const trail = 'Trail riding usually stays busy through October for you.'
const winter = 'Service work picks up for you from November, when riders stop riding.'

function reasonFor(onHand: number, onOrder: number, perWeek: number): string {
  const rate = describeWeeklyRate(perWeek)
  const coming = onOrder > 0 ? `, and ${onOrder} more ${onOrder === 1 ? 'is' : 'are'} on the way` : ''
  if (onHand <= 0) return `You sell ${rate} and have none left${coming}.`
  return `You sell ${rate}; the ${onHand} you have will last ${describeCover(onHand, perWeek)}${coming}.`
}

function build(plan: Plan): ProposedOrderView {
  const rnd = random(plan.seed)
  const leadWeeks = plan.leadTimeDays / 7
  const lines = catalog(plan.families).map((item, i): OrderLineView => {
    const weeklySales = [...Array(12)].map(() => Math.max(0, Math.round(item.rate * (0.4 + rnd() * 1.2))))
    const perWeek = average(weeklySales) || item.rate
    const onHand = Math.floor(rnd() * perWeek * 2.2)
    const onOrder = rnd() < 0.12 ? Math.max(1, Math.round(perWeek)) : 0
    const quantity = Math.max(1, Math.ceil(perWeek * (plan.coverWeeks + leadWeeks) - onHand - onOrder))
    const special = plan.special[item.variant ? `${item.name} · ${item.variant}` : item.name]
    const state = special?.state ?? 'ok'
    const confidence: Confidence = state === 'question' ? 'low' : state === 'review' ? 'medium' : rnd() < 0.1 ? 'medium' : 'high'
    const stock = Math.round(quantity * (1.5 + rnd() * 8))
    const smaller = Math.max(1, Math.round(quantity / 2))
    return {
      id: `${plan.id}-${i + 1}`,
      product: item.name,
      variant: item.variant,
      onHand,
      onOrder,
      quantity,
      unitCost: item.cost,
      state,
      reason: reasonFor(onHand, onOrder, perWeek),
      weeklySales,
      confidence,
      season: item.season,
      availability: stock > quantity * 3
        ? `${plan.supplier} shows plenty at its ${plan.warehouse} warehouse.`
        : `${plan.supplier} shows ${stock} at its ${plan.warehouse} warehouse.`,
      assumptions: [
        `Delivery in about ${plan.leadTimeDays} days`,
        `Enough to last about ${plan.coverWeeks} weeks after it arrives`,
        'Based on your last 12 weeks of sales',
      ],
      alternatives: quantity > 1
        ? [`Order ${smaller} now and top up with your next ${plan.supplier.split(' ')[0]} order.`]
        : [],
      ...special,
    }
  })
  return {
    id: plan.id,
    supplier: plan.supplier,
    currency: 'USD',
    leadTimeDays: plan.leadTimeDays,
    freeFreightAt: plan.freeFreightAt,
    orderBy: plan.orderBy,
    lines,
  }
}

const northline = build({
  id: 'northline',
  supplier: 'Northline Distribution',
  warehouse: 'Reno',
  leadTimeDays: 5,
  coverWeeks: 3,
  freeFreightAt: 1500,
  seed: 11,
  families: [
    { name: 'Shimano B01S resin disc brake pads', variants: ['Pair'], cost: 9.4, rate: 2 },
    { name: 'Maxxis Minion DHF', variants: ['29 × 2.5 WT EXO+'], cost: 58, rate: 1, season: trail },
    { name: 'Park Tool CT-3.3 chain tool', variants: [], cost: 21.5, rate: 0.2 },
    { name: 'Continental Grand Prix 5000 S TR', variants: ['700 × 25', '700 × 28', '700 × 30', '700 × 32'], cost: 52, rate: 0.8 },
    { name: 'Schwalbe inner tube', variants: ['700 × 25–32 Presta 40 mm', '700 × 25–32 Presta 60 mm', '29 × 2.1–2.4 Presta', '29 × 2.1–2.4 Schrader', '27.5 × 2.1–2.4 Presta', '26 × 1.9–2.4 Schrader', '20 × 1.5–2.4 Schrader', '16 × 1.75–2.4 Schrader'], cost: 6.2, rate: 3 },
    { name: 'KMC chain', variants: ['X9', 'X10', 'X11', 'X12'], cost: 24, rate: 1 },
    { name: 'Shimano CN-M8100 chain', variants: ['12-speed'], cost: 38, rate: 1 },
    { name: 'Shimano CN-HG701 chain', variants: ['11-speed'], cost: 31, rate: 1 },
    { name: 'SRAM PC-1110 chain', variants: ['11-speed'], cost: 22, rate: 0.6 },
    { name: 'Shimano Deore cassette CS-M6100', variants: ['10–51T'], cost: 62, rate: 0.5 },
    { name: 'Shimano 105 cassette CS-R7000', variants: ['11–30T', '11–32T'], cost: 44, rate: 0.5 },
    { name: 'Jagwire brake cable kit', variants: ['Road', 'Mountain'], cost: 14, rate: 1 },
    { name: 'Jagwire shift cable kit', variants: ['Road', 'Mountain'], cost: 12, rate: 1 },
    { name: 'ESI Chunky grips', variants: ['Black', 'Red', 'Blue'], cost: 17, rate: 0.6 },
    { name: 'ODI Elite Pro lock-on grips', variants: ['Black', 'Graphite'], cost: 18, rate: 0.5 },
    { name: 'Lizard Skins DSP 2.5 bar tape', variants: ['Black', 'White', 'Blue'], cost: 23, rate: 0.6 },
    { name: 'Muc-Off Nano Tech bike cleaner', variants: ['1 L'], cost: 9, rate: 1.5 },
    { name: 'Muc-Off lube', variants: ['Dry 120 ml', 'Wet 120 ml'], cost: 7.5, rate: 1.5 },
    { name: 'Finish Line lube', variants: ['Dry 2 oz', 'Wet 2 oz', 'Ceramic 2 oz'], cost: 6.8, rate: 1.2 },
    { name: 'Stan’s NoTubes tire sealant', variants: ['2 oz', '16 oz', '32 oz'], cost: 8, rate: 1.5 },
    { name: 'Stan’s NoTubes tubeless valve stems', variants: ['35 mm', '44 mm', '55 mm'], cost: 13, rate: 0.8 },
    { name: 'Genuine Innovations CO2 cartridges', variants: ['16 g, 3-pack', '25 g, single'], cost: 7, rate: 2 },
    { name: 'Park Tool TL-1.2 tire levers', variants: [], cost: 3.8, rate: 2 },
    { name: 'Park Tool MT-1.2 multi-tool', variants: [], cost: 16, rate: 0.5 },
    { name: 'SRAM Centerline rotor', variants: ['160 mm', '180 mm', '203 mm'], cost: 29, rate: 0.5 },
    { name: 'Shimano RT-MT800 rotor', variants: ['160 mm', '180 mm', '203 mm'], cost: 34, rate: 0.5 },
    { name: 'Shimano J05A resin disc brake pads', variants: ['Pair'], cost: 10.5, rate: 1.2 },
    { name: 'SRAM disc brake pads', variants: ['Organic, steel back', 'Sintered, steel back'], cost: 14, rate: 1 },
    { name: 'Maxxis Rekon', variants: ['29 × 2.4 WT EXO'], cost: 54, rate: 0.6, season: trail },
    { name: 'Maxxis Assegai', variants: ['29 × 2.5 WT EXO+'], cost: 60, rate: 0.5, season: trail },
    { name: 'Maxxis Ardent', variants: ['29 × 2.4 EXO'], cost: 48, rate: 0.5, season: trail },
    { name: 'WTB Vigilante', variants: ['29 × 2.5 TCS Light'], cost: 46, rate: 0.4, season: trail },
    { name: 'Continental Gatorskin', variants: ['700 × 25', '700 × 28'], cost: 36, rate: 0.6 },
    { name: 'Topeak JoeBlow Sport III floor pump', variants: [], cost: 32, rate: 0.3 },
    { name: 'Topeak Mini Dual G pump', variants: [], cost: 21, rate: 0.4 },
    { name: 'Crankbrothers Stamp 1 pedals', variants: ['Small', 'Large'], cost: 31, rate: 0.4 },
    { name: 'Shimano PD-M520 pedals', variants: [], cost: 28, rate: 0.6 },
    { name: 'Shimano SM-SH51 cleats', variants: [], cost: 12, rate: 0.8 },
    { name: 'Shimano SM-SH11 cleats', variants: [], cost: 14, rate: 0.6 },
    { name: 'Wheels Manufacturing derailleur hanger', variants: ['No. 31', 'No. 42', 'No. 189'], cost: 15, rate: 0.4 },
    { name: 'Velo Orange headset spacers', variants: ['1 1/8"'], cost: 6, rate: 0.3 },
  ],
  special: {
    'Shimano B01S resin disc brake pads · Pair': { state: 'ok', quantity: 6, onHand: 2, onOrder: 0, confidence: 'high', weeklySales: [1, 2, 1, 3, 2, 2, 3, 2, 3, 2, 2, 3],
      reason: 'You sell about 2 a week and have 2 left, about a week’s worth.',
      alternatives: ['Shimano J05A pads fit the same brakes and cost a little more.'] },
    'Maxxis Minion DHF · 29 × 2.5 WT EXO+': { state: 'review', quantity: 4, onHand: 1, onOrder: 0, weeklySales: [0, 1, 1, 0, 1, 2, 1, 1, 2, 1, 1, 2],
      reason: 'You sold 5 last October, more than your usual pace, so we added a little for fall.' },
    'Park Tool CT-3.3 chain tool': { state: 'question', quantity: 2, onHand: 0, onOrder: 0, weeklySales: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      reason: 'This is new to your store, so we started small.',
      question: { prompt: 'Do you plan to keep chain tools on the shelf, or order them for customers as needed?', choices: ['Keep on the shelf', 'Order as needed'] } },
    'Schwalbe inner tube · 29 × 2.1–2.4 Presta': { state: 'review', reason: 'Sales doubled in the last 3 weeks. We ordered for your usual pace; add more if you think it will last.' },
    'Continental Grand Prix 5000 S TR · 700 × 28': { state: 'review', reason: 'Selling faster than usual for this time of year. We kept the order close to your normal amount.' },
    'Maxxis Assegai · 29 × 2.5 WT EXO+': { state: 'review', reason: 'Northline has only a few left, so we suggest ordering now rather than next week.' },
    'Continental Gatorskin · 700 × 25': { state: 'review', reason: 'You returned 2 of these last month. Worth checking before reordering.' },
    'Shimano RT-MT800 rotor · 203 mm': { state: 'question', quantity: 2, reason: 'You haven’t stocked this size before, so we started small.',
      question: { prompt: 'Do you want to start stocking 203 mm rotors?', choices: ['Yes, keep a few', 'No, order as needed'] } },
    'Lizard Skins DSP 2.5 bar tape · White': { state: 'review', reason: 'Road riders usually re-tape in spring. We kept this order light until then.' },
    'Shimano Deore cassette CS-M6100 · 10–51T': { state: 'review', reason: 'This model is being replaced in the new year. We ordered just enough to get you there.' },
  },
})

const summit = build({
  id: 'summit',
  supplier: 'Summit Parts Supply',
  warehouse: 'Denver',
  leadTimeDays: 7,
  coverWeeks: 6,
  freeFreightAt: 750,
  orderBy: 'Thursday',
  seed: 29,
  families: [
    { name: 'Fox fork seal kit', variants: ['32 mm', '34 mm', '36 mm', '38 mm'], cost: 32, rate: 0.5, season: winter },
    { name: 'RockShox 200-hour service kit', variants: ['Pike', 'Lyrik', 'ZEB', 'SID'], cost: 45, rate: 0.4, season: winter },
    { name: 'RockShox 50-hour service kit', variants: ['35 mm', '32 mm'], cost: 18, rate: 0.6, season: winter },
    { name: 'Fox Transfer dropper remote lever', variants: [], cost: 48, rate: 0.3 },
    { name: 'PNW Loam dropper lever', variants: [], cost: 52, rate: 0.4 },
    { name: 'PNW Rainier dropper post', variants: ['125 mm', '150 mm', '170 mm', '200 mm'], cost: 128, rate: 0.3 },
    { name: 'OneUp V3 dropper post', variants: ['150 mm', '180 mm', '210 mm'], cost: 142, rate: 0.3 },
    { name: 'Fox suspension fluid', variants: ['5 wt', '20 wt Gold'], cost: 19, rate: 0.5, season: winter },
    { name: 'Motorex fork oil', variants: ['5W', '7.5W', '10W'], cost: 17, rate: 0.4, season: winter },
    { name: 'Fox shock bushing kit', variants: ['8 × 25 mm', '8 × 30 mm', '8 × 40 mm', '10 × 25 mm'], cost: 16, rate: 0.3, season: winter },
    { name: 'Fox HP shock pump', variants: [], cost: 34, rate: 0.3 },
    { name: 'RockShox high-pressure shock pump', variants: [], cost: 31, rate: 0.2 },
    { name: 'Enduro bearing kit', variants: ['6902', '6903', '6001', '6802'], cost: 22, rate: 0.4, season: winter },
    { name: 'Cane Creek 40 headset', variants: ['IS42/ZS44'], cost: 58, rate: 0.2 },
  ],
  special: {
    'RockShox 200-hour service kit · Pike': { state: 'review', reason: 'Service kits sell faster once riders stop riding. We ordered ahead of November.' },
    'PNW Rainier dropper post · 150 mm': { state: 'review', reason: 'You already have more droppers than usual, so we kept this one small.' },
    'Fox fork seal kit · 36 mm': { state: 'review', reason: 'Summit shows only 4 left, fewer than you’d usually want.' },
  },
})

/** Small, hand-set order: the example of an order short of free freight. */
const cascade: ProposedOrderView = {
  id: 'cascade',
  supplier: 'Cascade Components',
  currency: 'USD',
  leadTimeDays: 4,
  freeFreightAt: 300,
  lines: ([
    ['DT Swiss Champion spokes, 20-pack', '2.0 black, 292 mm', 1, 0, 1, 18, [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1]],
    ['DT Swiss Champion spokes, 20-pack', '2.0 black, 294 mm', 0, 0, 1, 18, [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0]],
    ['DT Swiss Pro Lock nipples, 100-pack', '2.0 × 12 mm', 0, 0, 1, 34, [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]],
    ['Stan’s NoTubes rim tape', '25 mm', 2, 0, 3, 12, [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1]],
    ['Stan’s NoTubes rim tape', '30 mm', 1, 0, 2, 13, [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]],
    ['Velox rim tape', '19 mm', 3, 0, 2, 4, [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]],
    ['Wheels Manufacturing bottom bracket', 'BSA, 24 mm', 1, 0, 1, 31, [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]],
    ['Shimano freehub body', 'HG, 11-speed', 0, 0, 1, 38, [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0]],
    ['DT Swiss Ratchet EXP spring kit', '', 0, 0, 1, 11, [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]],
  ] as const).map(([product, variant, onHand, onOrder, quantity, unitCost, sales], i): OrderLineView => {
    const perWeek = average([...sales])
    return {
      id: `cascade-${i + 1}`, product, variant: variant || undefined, onHand, onOrder, quantity, unitCost,
      state: 'ok', reason: reasonFor(onHand, onOrder, perWeek), weeklySales: [...sales], confidence: 'high',
      season: winter,
      availability: 'Cascade shows plenty at its Tacoma warehouse.',
      assumptions: ['Delivery in about 4 days', 'Enough for the next few wheel builds', 'Based on your last 12 weeks of sales'],
      alternatives: [],
    }
  }),
}

export const demoOrders: ProposedOrderView[] = [northline, summit, cascade]

export function findDemoOrder(id: string): ProposedOrderView | undefined {
  return demoOrders.find((o) => o.id === id)
}
