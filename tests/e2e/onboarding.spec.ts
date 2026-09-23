import { expect, test } from '@playwright/test'
import {
  PASSWORD, adminClient, completeAgreements, completeBusiness, completeLocation, confirmationLink,
  createConfirmedUser, organizationFor, signIn, uniqueEmail, userClient,
} from './support'

test('a new retailer signs up, confirms their email and completes onboarding', async ({ page }) => {
  const email = uniqueEmail('owner')

  await page.goto('/sign-up')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/check-email/)

  // Unconfirmed accounts cannot sign in yet.
  const early = await page.context().newPage()
  await signIn(early, email)
  await expect(early.getByText('Please confirm your email first.')).toBeVisible()
  await early.close()

  await page.goto(await confirmationLink(email))
  await completeBusiness(page, 'Summit Cycles E2E')
  await completeLocation(page, 'Main Street')
  await completeAgreements(page, 'declined')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Summit Cycles E2E is set up.')

  // Primary navigation: the four task destinations only.
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link')).toHaveText(['Today', 'Orders', 'Programs', 'Suppliers'])
  await nav.getByRole('link', { name: 'Orders' }).click()
  await expect(page).toHaveURL(/\/orders$/)

  // What was recorded.
  const { userId } = await userClient(email, PASSWORD)
  const memberships = await organizationFor(userId)
  expect(memberships).toHaveLength(1)
  expect(memberships[0]?.role).toBe('owner')
  const orgId = memberships[0]!.organization_id
  const admin = adminClient()

  const { data: org } = await admin.from('organization').select('*').eq('id', orgId).single()
  expect(org).toMatchObject({ kind: 'retailer', name: 'Summit Cycles E2E', default_country: 'US', created_by: userId })
  expect(org?.creation_request_id).toBeTruthy()

  const { data: locations } = await admin.from('location').select('*').eq('organization_id', orgId)
  expect(locations).toHaveLength(1)
  expect(locations?.[0]).toMatchObject({ name: 'Main Street', location_type: 'store', timezone: 'America/Denver', country: 'US', sells: true })

  const { data: decisions } = await admin.from('organization_agreement').select('*').eq('organization_id', orgId)
  expect(decisions).toHaveLength(2)
  const byType = Object.fromEntries((decisions ?? []).map((d) => [d.agreement_type, d]))
  expect(byType.platform_terms).toMatchObject({ decision: 'accepted', decided_by: userId, context: 'onboarding' })
  expect(byType.industry_intelligence).toMatchObject({ decision: 'declined', decided_by: userId, context: 'onboarding' })
  expect(byType.platform_terms?.presentation_id).toBeTruthy()
  expect(byType.platform_terms?.presentation_id).toBe(byType.industry_intelligence?.presentation_id)
  expect(byType.platform_terms?.agreement_version).toBeTruthy()
})

test('submitting the business form twice creates one organization', async ({ page }) => {
  const email = uniqueEmail('double')
  const userId = await createConfirmedUser(email)
  await signIn(page, email)
  await expect(page).toHaveURL(/\/onboarding\/business$/)
  await page.getByLabel('Business name').fill('Double Submit Bikes')
  await page.getByLabel('Country').selectOption({ label: 'Canada' })
  await page.evaluate(() => {
    const form = document.querySelector('form')!
    form.requestSubmit()
    form.requestSubmit()
  })
  await expect(page).toHaveURL(/\/onboarding\/location$/)
  const memberships = await organizationFor(userId)
  expect(memberships).toHaveLength(1)
  const { count } = await adminClient()
    .from('organization').select('id', { count: 'exact', head: true }).eq('created_by', userId)
  expect(count).toBe(1)
})

test('a partly onboarded retailer resumes where they left off', async ({ page }) => {
  const email = uniqueEmail('resume')
  await createConfirmedUser(email)
  await signIn(page, email)
  await completeBusiness(page, 'Resume Cycles')
  await page.goto('/today')
  await expect(page).toHaveURL(/\/onboarding\/location$/)
})
