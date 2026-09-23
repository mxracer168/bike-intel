import { expect, test } from '@playwright/test'
import {
  PASSWORD, adminClient, completeAgreements, completeBusiness, completeLocation, createConfirmedUser,
  organizationFor, signIn, uniqueEmail, userClient,
} from './support'

/**
 * Two retailers onboarded through the real app. Each then tries to reach the
 * other's private records with its own real session, the same access any
 * browser code would have. Row-level security must stop every attempt.
 */
test('two retailers cannot read or modify each other’s private records', async ({ browser }) => {
  const emailA = uniqueEmail('retailer-a')
  const emailB = uniqueEmail('retailer-b')
  const idA = await createConfirmedUser(emailA)
  const idB = await createConfirmedUser(emailB)

  // Retailer B completes onboarding.
  const pageB = await (await browser.newContext()).newPage()
  await signIn(pageB, emailB)
  await completeBusiness(pageB, 'Bravo Bikes')
  await completeLocation(pageB, 'Bravo Main')
  await completeAgreements(pageB, 'accepted')
  const orgB = (await organizationFor(idB))[0]!.organization_id

  // Retailer A onboards, and tries to smuggle B's organization id into a form.
  const pageA = await (await browser.newContext()).newPage()
  await signIn(pageA, emailA)
  await completeBusiness(pageA, 'Alpha Cycles')
  await expect(pageA).toHaveURL(/\/onboarding\/location$/)
  await pageA.evaluate((org) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'organizationId'
    input.value = org
    // The location form, not the header's sign-out form.
    document.querySelector('main form')!.appendChild(input)
  }, orgB)
  await completeLocation(pageA, 'Alpha Main')
  await completeAgreements(pageA, 'declined')
  const orgA = (await organizationFor(idA))[0]!.organization_id

  const admin = adminClient()
  const { data: bLocations } = await admin.from('location').select('name').eq('organization_id', orgB)
  expect(bLocations?.map((l) => l.name)).toEqual(['Bravo Main'])
  const { data: aLocations } = await admin.from('location').select('name').eq('organization_id', orgA)
  expect(aLocations?.map((l) => l.name)).toEqual(['Alpha Main'])

  // The app only ever shows A its own business.
  await expect(pageA.getByRole('region', { name: 'Current retailer' }).first()).toContainText('Alpha Cycles')
  await expect(pageA.getByText('Bravo Bikes')).toHaveCount(0)

  // Direct attempts with A's real session.
  const { client: a } = await userClient(emailA, PASSWORD)

  const reads = await Promise.all([
    a.from('organization').select('id').eq('id', orgB),
    a.from('membership').select('id').eq('organization_id', orgB),
    a.from('location').select('id').eq('organization_id', orgB),
    a.from('organization_agreement').select('id').eq('organization_id', orgB),
    a.from('organization_agreement_current').select('agreement_type').eq('organization_id', orgB),
    a.from('change_log').select('id').eq('organization_id', orgB),
  ])
  for (const r of reads) {
    expect(r.error).toBeNull()
    expect(r.data).toEqual([])
  }

  const renamed = await a.from('organization').update({ name: 'Hijacked' }).eq('id', orgB).select('id')
  expect(renamed.data ?? []).toEqual([])
  const moved = await a.from('location').update({ name: 'Hijacked' }).eq('organization_id', orgB).select('id')
  expect(moved.data ?? []).toEqual([])

  const addLocation = await a.from('location').insert({ organization_id: orgB, name: 'Sneaky', country: 'US', timezone: 'UTC' })
  expect(addLocation.error).not.toBeNull()
  const addConsent = await a.from('organization_agreement').insert({
    organization_id: orgB, agreement_type: 'industry_intelligence', agreement_version: 'x', decision: 'accepted', decided_by: idA,
  })
  expect(addConsent.error).not.toBeNull()
  const joinB = await a.from('membership').insert({ organization_id: orgB, user_id: idA, role: 'owner' })
  expect(joinB.error).not.toBeNull()
  const bootstrap = await a.rpc('bootstrap_retailer_organization', {
    p_user_id: idA, p_request_id: crypto.randomUUID(), p_name: 'Self-made', p_default_country: 'US',
  })
  expect(bootstrap.error).not.toBeNull()

  // B's records are unchanged.
  const { data: bOrg } = await admin.from('organization').select('name').eq('id', orgB).single()
  expect(bOrg?.name).toBe('Bravo Bikes')
  const { count: bMembers } = await admin.from('membership').select('id', { count: 'exact', head: true }).eq('organization_id', orgB)
  expect(bMembers).toBe(1)
  const { count: bDecisions } = await admin.from('organization_agreement').select('id', { count: 'exact', head: true }).eq('organization_id', orgB)
  expect(bDecisions).toBe(2)
})

test('signed-out visitors cannot read any retailer data', async () => {
  const { createClient } = await import('@supabase/supabase-js')
  const { e2eEnv } = await import('./support')
  const anon = createClient(e2eEnv.url, e2eEnv.publishableKey, { auth: { persistSession: false } })
  for (const table of ['organization', 'membership', 'location', 'organization_agreement'] as const) {
    const { data } = await anon.from(table).select('id')
    expect(data ?? []).toEqual([])
  }
})
