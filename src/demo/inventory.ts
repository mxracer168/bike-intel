/**
 * EXAMPLE DATA for the Inventory page. Fictional quantities and costs for
 * real bicycle brands; never written to the database. Brand and category
 * totals on the page are summed from these items, so a chart and the table
 * behind it always agree.
 */
import type { InventoryItemView, InventoryLocation } from '@/features/inventory/types'

type Row = [product: string, variant: string, brand: string, category: string, supplier: string, cost: number, onHand: number, perWeek: number, onOrder?: number]

const NL = 'Northline Distribution'
const SP = 'Summit Parts Supply'
const CC = 'Cascade Components'
const TB = 'Trek Bicycle'

const rows: Row[] = [
  // Shimano
  ['Shimano 105 R7100 Di2 groupset', '2 × 12-speed', 'Shimano', 'Drivetrain', NL, 1180, 10, 0.3],
  ['Shimano GRX RX820 groupset', '1 × 12-speed', 'Shimano', 'Drivetrain', NL, 610, 11, 0.4],
  ['Shimano Ultegra R8170 wheelset', 'C36 tubeless', 'Shimano', 'Wheels', NL, 690, 8, 0.2],
  ['Shimano Deore XT M8100 cassette', '10–51T', 'Shimano', 'Drivetrain', NL, 118, 14, 1.2, 4],
  ['Shimano SLX M7100 cassette', '10–51T', 'Shimano', 'Drivetrain', NL, 68, 18, 1.4],
  ['Shimano Deore XT M8100 crankset', '170 mm', 'Shimano', 'Drivetrain', NL, 210, 8, 0.4],
  ['Shimano Deore XT M8100 rear derailleur', '12-speed', 'Shimano', 'Drivetrain', NL, 96, 10, 0.6],
  ['Shimano Deore M6100 rear derailleur', '12-speed', 'Shimano', 'Drivetrain', NL, 54, 14, 0.9],
  ['Shimano SLX M7100 shifter', '12-speed', 'Shimano', 'Drivetrain', NL, 32, 20, 1.1],
  ['Shimano CN-M8100 chain', '12-speed', 'Shimano', 'Drivetrain', NL, 38, 40, 3.1, 12],
  ['Shimano CN-HG701 chain', '11-speed', 'Shimano', 'Drivetrain', NL, 31, 32, 2.4],
  ['Shimano Deore XT M8120 brake', '4-piston, rear', 'Shimano', 'Brakes', NL, 142, 16, 0.9],
  ['Shimano Deore M6100 brake', '2-piston, rear', 'Shimano', 'Brakes', NL, 64, 24, 1.4],
  ['Shimano RT-MT800 rotor', '180 mm', 'Shimano', 'Brakes', NL, 34, 30, 1.8],
  ['Shimano B01S resin disc brake pads', 'Pair', 'Shimano', 'Brakes', NL, 9.4, 42, 11, 20],
  ['Shimano J05A resin disc brake pads', 'Pair', 'Shimano', 'Brakes', NL, 10.5, 36, 4.2],
  ['Shimano PD-M520 pedals', '', 'Shimano', 'Accessories', NL, 28, 24, 1.3],
  ['Shimano SM-SH51 cleats', '', 'Shimano', 'Accessories', NL, 12, 40, 2.6],
  ['Shimano RC3 road shoes', 'Assorted sizes', 'Shimano', 'Apparel & helmets', NL, 88, 12, 0.5],
  ['Shimano cable and housing kit', 'Road and mountain', 'Shimano', 'Drivetrain', NL, 14, 60, 3.4],
  ['Shimano chain connecting pins', '11/12-speed', 'Shimano', 'Drivetrain', NL, 1.2, 104, 5],
  ['Shimano Premium grease', '1 lb', 'Shimano', 'Shop supplies', NL, 18, 20, 0.6],
  ['Shimano Tourney rear derailleur', '7-speed', 'Shimano', 'Drivetrain', NL, 12, 30, 1.5],
  // Trek
  ['Trek Fuel EX 5', 'Gen 6, assorted sizes', 'Trek', 'Complete bikes', TB, 2050, 3, 0.25],
  ['Trek Rail 5', 'e-MTB, medium', 'Trek', 'Complete bikes', TB, 3450, 1, 0.08],
  ['Trek Checkpoint ALR 5', 'Assorted sizes', 'Trek', 'Complete bikes', TB, 1480, 3, 0.2],
  ['Trek Marlin 7', 'Gen 3, assorted sizes', 'Trek', 'Complete bikes', TB, 760, 5, 0.6],
  ['Trek Marlin 5', 'Gen 3, assorted sizes', 'Trek', 'Complete bikes', TB, 560, 6, 0.7],
  ['Trek FX 2', 'Assorted sizes', 'Trek', 'Complete bikes', TB, 520, 6, 0.6],
  ['Trek Domane AL 2', 'Assorted sizes', 'Trek', 'Complete bikes', TB, 700, 4, 0.3],
  ['Trek Verve 2', 'Assorted sizes', 'Trek', 'Complete bikes', TB, 530, 5, 0.4],
  ['Trek Precaliber 20', 'Kids’ 20-inch', 'Trek', 'Complete bikes', TB, 230, 8, 0.5],
  // SRAM (and RockShox, Zipp)
  ['SRAM GX Eagle AXS Transmission', 'Groupset', 'SRAM', 'Drivetrain', SP, 820, 6, 0.3],
  ['Zipp 303 Firecrest wheelset', 'Tubeless, disc', 'SRAM', 'Wheels', SP, 1050, 4, 0.1],
  ['RockShox Pike Ultimate fork', '29, 140 mm', 'SRAM', 'Suspension', SP, 610, 6, 0.3],
  ['RockShox Lyrik Select fork', '29, 160 mm', 'SRAM', 'Suspension', SP, 520, 4, 0.2],
  ['RockShox Reverb AXS dropper', '170 mm', 'SRAM', 'Suspension', SP, 480, 5, 0.2],
  ['RockShox Deluxe Select+ shock', '210 × 55', 'SRAM', 'Suspension', SP, 250, 6, 0.3],
  ['RockShox fork service kit', '35 mm', 'SRAM', 'Suspension', SP, 38, 20, 0.8],
  ['SRAM Code RSC brake', 'Rear', 'SRAM', 'Brakes', SP, 196, 8, 0.4],
  ['SRAM Level T brake', 'Rear', 'SRAM', 'Brakes', SP, 58, 14, 0.8],
  ['SRAM Centerline rotor', '180 mm', 'SRAM', 'Brakes', NL, 29, 26, 1.4],
  ['SRAM disc brake pads', 'Organic', 'SRAM', 'Brakes', NL, 14, 40, 3.2],
  ['SRAM GX Eagle cassette', '10–52T', 'SRAM', 'Drivetrain', SP, 172, 10, 0.6],
  ['SRAM NX Eagle cassette', '11–50T', 'SRAM', 'Drivetrain', SP, 58, 14, 0.9],
  ['SRAM PC-1110 chain', '11-speed', 'SRAM', 'Drivetrain', NL, 22, 24, 1.8],
  ['SRAM X01 Eagle chain', '12-speed', 'SRAM', 'Drivetrain', SP, 48, 12, 0.9],
  ['SRAM bleed kit', 'DOT', 'SRAM', 'Tools', NL, 45, 6, 0.2],
  // Maxxis
  ['Maxxis Minion DHF', '29 × 2.5 WT EXO+', 'Maxxis', 'Tires', NL, 58, 18, 2.9, 6],
  ['Maxxis Minion DHR II', '29 × 2.4 WT EXO+', 'Maxxis', 'Tires', NL, 58, 16, 2.2],
  ['Maxxis Assegai', '29 × 2.5 WT EXO+', 'Maxxis', 'Tires', NL, 60, 14, 1.4],
  ['Maxxis Rekon', '29 × 2.4 WT EXO', 'Maxxis', 'Tires', NL, 54, 20, 2.1],
  ['Maxxis Ardent', '29 × 2.4 EXO', 'Maxxis', 'Tires', NL, 48, 12, 1.1],
  ['Maxxis High Roller III', '29 × 2.4 WT', 'Maxxis', 'Tires', NL, 58, 24, 0.8],
  ['Maxxis Dissector', '29 × 2.4 WT', 'Maxxis', 'Tires', NL, 56, 20, 0.6],
  ['Maxxis Aggressor', '29 × 2.5 WT DD', 'Maxxis', 'Tires', NL, 62, 12, 0.7],
  ['Maxxis Ikon', '29 × 2.2 EXO', 'Maxxis', 'Tires', NL, 45, 12, 0.9],
  ['Maxxis Rambler', '700 × 40 EXO', 'Maxxis', 'Tires', NL, 44, 20, 1.6],
  ['Maxxis Receptor', '700 × 40 EXO', 'Maxxis', 'Tires', NL, 46, 14, 0.9],
  ['Maxxis Re-Fuse', '700 × 32', 'Maxxis', 'Tires', NL, 38, 20, 1.2],
  ['Maxxis Minion DHF', '27.5 × 2.5 WT EXO+', 'Maxxis', 'Tires', NL, 52, 12, 0.7],
  ['Maxxis Minion DHF DH', '29 × 2.5 WT DH', 'Maxxis', 'Tires', NL, 72, 10, 0.4],
  ['Maxxis Welterweight tube', '29 × 2.0–2.5 Presta', 'Maxxis', 'Tubes & spokes', NL, 8, 120, 6],
  ['Maxxis Minion DHR II', '27.5 × 2.4 WT EXO+', 'Maxxis', 'Tires', NL, 56, 30, 1.1],
  ['Maxxis Minion DHR II', '29 × 2.6 EXO+', 'Maxxis', 'Tires', NL, 60, 24, 0.9],
  ['Maxxis Forekaster', '29 × 2.4 EXO', 'Maxxis', 'Tires', NL, 52, 20, 0.8],
  ['Maxxis Minion DHF', '29 × 2.6 EXO+', 'Maxxis', 'Tires', NL, 60, 20, 0.7],
  ['Maxxis Ardent Race', '29 × 2.35 EXO', 'Maxxis', 'Tires', NL, 52, 10, 0.4],
  // Fox
  ['Fox Transfer dropper post', 'Performance, 150 mm', 'Fox', 'Suspension', SP, 260, 9, 0.464],
  ['Fox 36 Performance fork', '29, 160 mm', 'Fox', 'Suspension', SP, 640, 5, 0.2],
  ['Fox 34 Rhythm fork', '29, 130 mm', 'Fox', 'Suspension', SP, 440, 5, 0.3],
  ['Fox Float DPS shock', '210 × 50', 'Fox', 'Suspension', SP, 290, 6, 0.3],
  ['Fox Float X shock', '230 × 60', 'Fox', 'Suspension', SP, 450, 3, 0.1],
  ['Fox fork seal kit', '36 mm', 'Fox', 'Suspension', SP, 32, 24, 0.9],
  ['Fox Speedframe helmet', 'MIPS, assorted sizes', 'Fox', 'Apparel & helmets', SP, 95, 10, 0.4],
  ['Fox Ranger gloves', 'Assorted sizes', 'Fox', 'Apparel & helmets', SP, 18, 24, 1.1],
  // Everyone else
  ['DT Swiss Competition spokes', '2.0/1.8 mm, assorted lengths', 'DT Swiss', 'Tubes & spokes', CC, 0.78, 620, 28],
  ['DT Swiss Pro Lock nipples', '14 mm, black', 'DT Swiss', 'Tubes & spokes', CC, 0.22, 800, 30],
  ['DT Swiss 350 rear hub', 'Boost, Micro Spline', 'DT Swiss', 'Wheels', CC, 190, 4, 0.2],
  ['DT Swiss XM 1700 wheelset', '29, Boost', 'DT Swiss', 'Wheels', CC, 480, 4, 0.1],
  ['Schwalbe inner tube', '700 × 25–32 Presta 40 mm', 'Schwalbe', 'Tubes & spokes', NL, 6.2, 140, 9],
  ['Schwalbe inner tube', '29 × 2.1–2.4 Presta', 'Schwalbe', 'Tubes & spokes', NL, 6.2, 90, 6],
  ['Schwalbe inner tube', '27.5 × 2.1–2.4 Presta', 'Schwalbe', 'Tubes & spokes', NL, 6.2, 60, 3],
  ['Schwalbe inner tube', '26 × 1.9–2.4 Schrader', 'Schwalbe', 'Tubes & spokes', NL, 5.5, 40, 1.6],
  ['Schwalbe inner tube', '20 × 1.5–2.4 Schrader', 'Schwalbe', 'Tubes & spokes', NL, 5, 30, 1.2],
  ['Schwalbe Marathon Plus', '700 × 38', 'Schwalbe', 'Tires', NL, 34, 16, 0.8],
  ['Schwalbe Big Apple', '26 × 2.15', 'Schwalbe', 'Tires', NL, 26, 10, 0],
  ['Continental Grand Prix 5000 S TR', '700 × 28', 'Continental', 'Tires', NL, 52, 20, 1.3],
  ['Continental Grand Prix 5000 S TR', '700 × 25', 'Continental', 'Tires', NL, 52, 14, 0.9],
  ['Continental Grand Prix 5000 S TR', '700 × 32', 'Continental', 'Tires', NL, 52, 10, 0.5],
  ['Continental Gatorskin', '700 × 25', 'Continental', 'Tires', NL, 36, 16, 0.6],
  ['Continental Terra Speed', '700 × 40', 'Continental', 'Tires', NL, 48, 12, 0.7],
  ['Park Tool PCS-10.3 repair stand', '', 'Park Tool', 'Tools', NL, 210, 2, 0.05],
  ['Park Tool TS-2.2 truing stand', '', 'Park Tool', 'Tools', NL, 290, 1, 0.02],
  ['Park Tool TW-5.2 torque wrench', '2–14 Nm', 'Park Tool', 'Tools', NL, 95, 3, 0.1],
  ['Park Tool CT-3.3 chain tool', '', 'Park Tool', 'Tools', NL, 21.5, 6, 0.2],
  ['Park Tool TL-1.2 tire levers', 'Set of 2', 'Park Tool', 'Tools', NL, 3.8, 40, 2.4],
  ['Park Tool AWS-10 hex wrench set', '', 'Park Tool', 'Tools', NL, 19, 8, 0.3],
  ['Stan’s NoTubes tire sealant', '32 oz', 'Stan’s NoTubes', 'Shop supplies', NL, 38, 10, 0.6],
  ['Stan’s NoTubes tire sealant', '2 oz', 'Stan’s NoTubes', 'Shop supplies', NL, 8, 36, 2.2],
  ['Stan’s NoTubes tubeless valve stems', '44 mm', 'Stan’s NoTubes', 'Tubes & spokes', NL, 13, 30, 1.4],
  ['Stan’s NoTubes Flow MK4 rim', '29, 32h', 'Stan’s NoTubes', 'Wheels', CC, 95, 8, 0.2],
  ['Bontrager Starvos WaveCel helmet', 'Assorted sizes', 'Bontrager', 'Apparel & helmets', TB, 70, 14, 0.7],
  ['Bontrager Ion 200 RT front light', '', 'Bontrager', 'Accessories', TB, 45, 16, 0.8],
  ['Bontrager water bottle', '24 oz', 'Bontrager', 'Accessories', TB, 4, 80, 4],
  ['Bontrager Elite bottle cage', '', 'Bontrager', 'Accessories', TB, 9, 40, 1.8],
  ['Giro Syntax MIPS helmet', 'Assorted sizes', 'Giro', 'Apparel & helmets', CC, 85, 8, 0.3],
  ['Giro Fixture MIPS helmet', 'Assorted sizes', 'Giro', 'Apparel & helmets', CC, 38, 16, 0.9],
  ['Giro Scamp kids’ helmet', 'Assorted sizes', 'Giro', 'Apparel & helmets', CC, 26, 20, 0.8],
  ['Pearl Izumi Quest jersey', 'Assorted sizes', 'Pearl Izumi', 'Apparel & helmets', CC, 38, 30, 0.9],
  ['Pearl Izumi Quest shorts', 'Assorted sizes', 'Pearl Izumi', 'Apparel & helmets', CC, 44, 24, 0.6],
  ['Pearl Izumi Select gloves', 'Assorted sizes', 'Pearl Izumi', 'Apparel & helmets', CC, 16, 30, 0],
  ['Lezyne Macro Drive 1400+ light', '', 'Lezyne', 'Accessories', NL, 62, 12, 0.5],
  ['Lezyne KTV Drive rear light', '', 'Lezyne', 'Accessories', NL, 22, 24, 1.2],
  ['Lezyne Control Drive CO2 inflator', '', 'Lezyne', 'Accessories', NL, 18, 20, 0.8],
  ['Topeak JoeBlow Sport III floor pump', '', 'Topeak', 'Accessories', NL, 32, 8, 0.3],
  ['Topeak Mini Dual G pump', '', 'Topeak', 'Accessories', NL, 21, 12, 0.5],
  ['Topeak Explorer rear rack', 'Disc mount', 'Topeak', 'Accessories', NL, 48, 6, 0.2],
  ['Kryptonite New-U Evolution lock', 'Mini-7', 'Kryptonite', 'Accessories', CC, 58, 10, 0.4],
  ['Kryptonite KryptoLok lock', 'Standard', 'Kryptonite', 'Accessories', CC, 42, 8, 0.3],
  ['Crankbrothers Candy 3 pedals', '', 'Crankbrothers', 'Accessories', NL, 98, 6, 0.2],
  ['Crankbrothers Stamp 1 pedals', 'Large', 'Crankbrothers', 'Accessories', NL, 31, 10, 0.4],
  ['ESI Chunky grips', 'Black', 'ESI', 'Accessories', NL, 17, 20, 0.7],
  ['Lizard Skins DSP 2.5 bar tape', 'Black', 'Lizard Skins', 'Accessories', NL, 23, 18, 0.5],
  ['Muc-Off Nano Tech bike cleaner', '1 L', 'Muc-Off', 'Shop supplies', NL, 9, 30, 1.5],
  ['Finish Line Dry lube', '2 oz', 'Finish Line', 'Shop supplies', NL, 6.8, 36, 1.4],
  ['Tern GSD S10 cargo e-bike', '', 'Tern', 'Complete bikes', CC, 3100, 2, 0.05],
  ['woom 4', 'Kids’ 20-inch', 'woom', 'Complete bikes', CC, 440, 8, 0.4],
  ['woom 3', 'Kids’ 16-inch', 'woom', 'Complete bikes', CC, 380, 6, 0.3],
  ['Surly Bridge Club', 'Assorted sizes', 'Surly', 'Complete bikes', NL, 1100, 3, 0.1],
  ['Thule EasyFold XT 2 hitch rack', '', 'Thule', 'Accessories', CC, 380, 6, 0.2],
  ['Garmin Edge 840', '', 'Garmin', 'Accessories', NL, 330, 8, 0.3],
  ['Wahoo KICKR Core trainer', '', 'Wahoo', 'Accessories', NL, 520, 5, 0.1],
  ['Wahoo ELEMNT Bolt', '', 'Wahoo', 'Accessories', NL, 190, 6, 0.2],
  ['Ride Concepts Livewire shoes', 'Assorted sizes', 'Ride Concepts', 'Apparel & helmets', CC, 90, 12, 0.4],
  ['CatEye Volt 400 light', '', 'CatEye', 'Accessories', NL, 28, 24, 0.9],
]

/** Deterministic noise so the example looks the same on every load. */
function random(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
}

const TODAY = Date.UTC(2026, 8, 25)
const daysAgo = (d: number) => new Date(TODAY - Math.round(d) * 86400000).toISOString().slice(0, 10)

/** Rows whose example coverage is quoted in the product brief; their pace is used exactly. */
const EXACT = new Set(['Maxxis Minion DHF|29 × 2.5 WT EXO+', 'Shimano B01S resin disc brake pads|Pair', 'Fox Transfer dropper post|Performance, 150 mm'])
/** The rows above list a slow-season pace; the example runs at a typical one. */
const PACE = 1.75

/** How demo stock is spread when the retailer has more than one stocking location. */
const SPLIT = [0.5, 0.3, 0.2, 0.1, 0.05]

/**
 * The example inventory, spread across the retailer's own stocking locations
 * (one location: everything is there).
 */
export function demoInventory(locations: InventoryLocation[]): InventoryItemView[] {
  const rnd = random(20260925)
  const weights = locations.map((_, i) => SPLIT[i] ?? 0.05)
  const total = weights.reduce((a, b) => a + b, 0)
  return rows.map(([product, variant, brand, category, supplier, cost, onHand, listed, onOrder = 0], i) => {
    const perWeek = EXACT.has(`${product}|${variant}`) ? listed : Math.round(listed * PACE * 100) / 100
    // Split on hand by location; the first location takes any rounding remainder.
    const parts = weights.map((w) => Math.floor((onHand * w) / total))
    parts[0] = (parts[0] ?? 0) + onHand - parts.reduce((a, b) => a + b, 0)
    const weeklySales = [...Array(12)].map(() => Math.max(0, Math.round(perWeek * (0.4 + rnd() * 1.2))))
    const selling = perWeek > 0
    const id = `inv-${i + 1}`
    return {
      id,
      product,
      variant: variant || undefined,
      brand,
      category,
      supplier,
      unitCost: cost,
      onHand,
      onOrder,
      perWeek,
      weeklySales: selling ? weeklySales : weeklySales.map(() => 0),
      lastSale: selling ? daysAgo(1 + rnd() * Math.min(20, 3 / perWeek)) : daysAgo(96 + rnd() * 60),
      lastReceipt: daysAgo(6 + rnd() * 40),
      lastPurchaseQty: Math.max(1, Math.round(onHand * (0.4 + rnd() * 0.6))),
      byLocation: locations.map((l, j) => ({ locationId: l.id, name: l.name, onHand: parts[j] ?? 0 })),
      // Searched, not shown: the retailer's part number and a UPC.
      identifiers: [`PW-${String(10400 + i * 7)}`, `0${String(72774000000 + i * 1373).padStart(11, '0')}`],
    }
  })
}

/** The example's turn and change over time (a turn needs a year of history; weeks of supply is summed from the items). */
export const demoInventoryTrends = {
  weeksOfSupply: { direction: 'down' as const, text: '0.8 weeks', good: true },
  turn: { value: '3.7×', trend: { direction: 'up' as const, text: 'from 3.3×', good: true } },
}
