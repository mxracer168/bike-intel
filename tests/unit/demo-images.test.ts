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
