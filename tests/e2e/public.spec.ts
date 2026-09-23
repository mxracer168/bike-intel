import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = ['/sign-in', '/sign-up']

for (const path of pages) {
  test.describe(path, () => {
    test('has one clear primary action and no serious accessibility issues', async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('button[type=submit]')).toHaveCount(1)
      const results = await new AxeBuilder({ page }).analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })

    test('fits a phone screen without sideways scrolling', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })

    test('uses the Visual Direction canvas, ink and typeface', async ({ page }) => {
      await page.goto(path)
      const body = await page.evaluate(() => {
        const s = getComputedStyle(document.body)
        return { bg: s.backgroundColor, color: s.color, font: s.fontFamily }
      })
      expect(body.bg).toBe('rgb(250, 249, 247)')
      expect(body.color).toBe('rgb(34, 33, 31)')
      expect(body.font).toMatch(/Hanken/)
    })
  })
}

test('sign-up explains problems in plain words before contacting the server', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByLabel('Work email').fill('not-an-email')
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await expect(page.getByText('Use at least 10 characters.')).toBeVisible()
  // What they typed is kept, so they only fix what's wrong.
  await expect(page.getByLabel('Work email')).toHaveValue('not-an-email')
})

test('a sign-in problem is explained once, in plain words', async ({ page }) => {
  // No Supabase is reachable in this suite, so the server reports a failure.
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill('someone@example.com')
  await page.getByLabel('Password').fill('any-password-at-all')
  await page.getByRole('button', { name: 'Sign in' }).click()
  const message = page.getByText('Something went wrong on our side. Please try again.')
  await expect(message).toHaveCount(1)
})

test('signed-out visitors are sent to sign in', async ({ page }) => {
  for (const path of ['/today', '/orders', '/onboarding', '/onboarding/business']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/sign-in$/)
  }
})

test('responses carry basic security headers', async ({ request }) => {
  const res = await request.get('/sign-in')
  expect(res.headers()['x-frame-options']).toBe('DENY')
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
  expect(res.headers()['x-powered-by']).toBeUndefined()
})
