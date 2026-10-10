import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain JavaScript helper for the local image script
import { bestMatch, requiredWords } from '../../scripts/demo-images/match.mjs'

const r = (title: string, vendor?: string) => ({ title, vendor, url: `https://shop.test/${title}`, image: 'https://cdn.test/x.jpg' })

describe('matching example products to store results', () => {
  it('requires the model words, not the category words', () => {
    expect(requiredWords('Maxxis Minion DHF', 'Maxxis')).toEqual(['minion', 'dhf'])
    expect(requiredWords('Shimano 105 cassette CS-R7000', 'Shimano')).toEqual(['105', 'cs', 'r7000'])
    expect(requiredWords('Schwalbe inner tube', 'Schwalbe')).toEqual(['inner', 'tube'])
    expect(requiredWords('Stan’s NoTubes sealant', 'Stan’s NoTubes')).toEqual(['sealant'])
  })

  it('takes the closest title that has every required word and the brand', () => {
    const dhf = { name: 'Maxxis Minion DHF', brand: 'Maxxis' }
    const m = bestMatch(dhf, [r('Maxxis Minion DHR II Tire 29 x 2.4'), r('Maxxis Minion DHF / DHR II Combo Pack Tire'), r('Maxxis Minion DHF Tire - 29 x 2.5, Tubeless, Folding')])
    expect(m.title).toBe('Maxxis Minion DHF Tire - 29 x 2.5, Tubeless, Folding')
  })

  it('accepts the brand from the vendor field, and rejects other brands and missing model numbers', () => {
    expect(bestMatch({ name: 'Park Tool CT-3.3 chain tool', brand: 'Park Tool' }, [r('CT-3.3 Chain Tool', 'Park Tool')])?.title).toBe('CT-3.3 Chain Tool')
    expect(bestMatch({ name: 'Park Tool CT-3.3 chain tool', brand: 'Park Tool' }, [r('CT-3.3 Chain Tool', 'Feedback Sports')])).toBeNull()
    expect(bestMatch({ name: 'Shimano 105 cassette CS-R7000', brand: 'Shimano' }, [r('Shimano 105 CS-R7100 Cassette')])).toBeNull()
  })

  it('ignores results without an image', () => {
    expect(bestMatch({ name: 'KMC chain', brand: 'KMC' }, [{ title: 'KMC X11 Chain', url: 'u' }])).toBeNull()
  })
})

describe('relaxed demo matching (--relaxed)', () => {
  // @ts-expect-error -- plain JavaScript helper for the local image script
  const load = () => import('../../scripts/demo-images/match.mjs')

  it('reads the general product type, most specific first', async () => {
    const { productType } = await load()
    expect(productType('Maxxis Minion DHF')).toBeNull()
    expect(productType('Continental Gatorskin tire')).toBe('tire')
    expect(productType('Park Tool TL-1.2 Tire Levers')).toBe('tool')
    expect(productType('Bontrager Elite bottle cage')).toBe('bottle cage')
    expect(productType('Bontrager water bottle')).toBe('bottle')
    expect(productType('Muc-Off chain lube')).toBe('lube')
    expect(productType('ODI Elite Pro lock-on grips')).toBe('grips')
    expect(productType('DT Swiss 350 rear hub')).toBe('hub')
    expect(productType('Shimano freehub body')).toBe('freehub')
  })

  it('takes the same brand and type, allowing size, color and model differences, preferring shared name words', async () => {
    const { relaxedMatch } = await load()
    const cage = { name: 'Bontrager Elite bottle cage', brand: 'Bontrager' }
    const m = relaxedMatch(cage, [
      r('Bontrager Elite Recycled Water Bottle'),
      r('Bontrager Bat Cage Bottle Cage, Black'),
      r('Bontrager Elite Bottle Cage - Gloss Black'),
    ])
    expect(m.title).toBe('Bontrager Elite Bottle Cage - Gloss Black')
    const light = { name: 'Bontrager Ion 200 RT front light', brand: 'Bontrager' }
    expect(relaxedMatch(light, [r('Bontrager Ion Pro RT Front Bike Light')])?.title).toBe('Bontrager Ion Pro RT Front Bike Light')
  })

  it('never crosses brand or type, and needs a type it can read', async () => {
    const { relaxedMatch } = await load()
    const tire = { name: 'Continental Gatorskin tire', brand: 'Continental' }
    expect(relaxedMatch(tire, [r('Continental Tire Levers'), r('Continental Race 28 Inner Tube'), r('Schwalbe Durano Tire')])).toBeNull()
    expect(relaxedMatch({ name: 'Maxxis Minion DHF', brand: 'Maxxis' }, [r('Maxxis Minion DHR II Tire')])).toBeNull()
    expect(relaxedMatch({ name: 'Crankbrothers Stamp 1 pedals', brand: 'Crankbrothers' }, [r('Pedal Pins', 'Crankbrothers'), r('Candy 3 Pedals', 'Crankbrothers')])?.title).toBe('Candy 3 Pedals')
  })

  it('falls back to the catalog category for our product, never for a store result', async () => {
    const { ownType, relaxedMatch, productType } = await load()
    const rekon = { name: 'Maxxis Rekon', brand: 'Maxxis', category: 'Tires' }
    expect(ownType(rekon)).toBe('tire')
    expect(relaxedMatch(rekon, [r('Maxxis Rekon Race 29 x 2.35 Tire'), r('Maxxis Rekon')])?.title).toBe('Maxxis Rekon Race 29 x 2.35 Tire')
    expect(relaxedMatch(rekon, [r('Maxxis Rekon')])).toBeNull()
    expect(ownType({ name: 'Trek Marlin 7', brand: 'Trek', category: 'Complete bikes' })).toBe('bike')
    expect(productType('Trek Marlin 7 Mountain Bike')).toBe('bike')
    expect(productType('Trek Bike Light')).toBe('light')
    expect(productType('Shimano Deore XT M8120 brake')).toBe('brake')
    expect(productType('Shimano Deore brake pads')).toBe('brake pads')
    expect(productType('Jagwire brake cable kit')).toBe('cable')
  })

  it('searches broadly by brand and type', async () => {
    const { relaxedQuery } = await load()
    expect(relaxedQuery({ name: 'Bontrager Elite bottle cage', brand: 'Bontrager' })).toBe('Bontrager bottle cage')
    expect(relaxedQuery({ name: 'Maxxis Minion DHF', brand: 'Maxxis' })).toBeNull()
  })

  it('never puts an exact image up for an approximate one', async () => {
    const { plan } = await load()
    const exact = { src: 'x', match: 'exact' }
    const legacy = { src: 'x' }
    const approx = { src: 'x', match: 'approximate' }
    expect(plan(exact, { relaxed: true })).toBe('skip')
    expect(plan(legacy, { relaxed: true })).toBe('skip')
    expect(plan(exact, { relaxed: true, refresh: true })).toBe('strict')
    expect(plan(approx, {})).toBe('strict')
    expect(plan(approx, { relaxed: true })).toBe('strict+relaxed')
    expect(plan(undefined, { relaxed: true })).toBe('strict+relaxed')
    expect(plan(undefined, {})).toBe('strict')
  })
})
