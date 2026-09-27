import { expect, test } from '@playwright/test'
import {
  PASSWORD, adminClient, completeAgreements, completeBusiness, completeLocation, createConfirmedUser,
  organizationFor, signIn, uniqueEmail, userClient,
} from './support'

/**
 * Business rules through the real app: an owner adds, rewords and stops a
 * rule; history survives; a member can read but not change rules; another
 * retailer can't reach them; and nothing without an owner's own session (the
 * service role included) can create or change one.
 */
test('owners manage business rules; history is kept; nobody else can change them', async ({ browser }) => {
  const ownerEmail = uniqueEmail('rules-owner')
  const ownerId = await createConfirmedUser(ownerEmail)
  const page = await (await browser.newContext()).newPage()
  await signIn(page, ownerEmail)
  await completeBusiness(page, 'Rule Makers Cycles')
  await completeLocation(page, 'Rule Makers Main')
  await completeAgreements(page, 'declined')
  const orgId = (await organizationFor(ownerId))[0]!.organization_id

  await page.goto('/business/profile')
  const rules = page.getByRole('region', { name: 'Business rules' })
  await expect(rules).toContainText('No business rules yet.')

  // Add.
  await rules.getByRole('button', { name: 'Add a rule' }).click()
  await rules.getByRole('textbox', { name: 'New business rule' }).fill('We do not sell road bikes.')
  await rules.getByRole('button', { name: 'Add rule' }).click()
  await expect(rules.getByText('We do not sell road bikes.', { exact: true })).toBeVisible()

  // Persists across a reload.
  await page.reload()
  await expect(rules.getByText('We do not sell road bikes.', { exact: true })).toBeVisible()

  // Edit.
  await rules.getByRole('button', { name: 'Edit: We do not sell road bikes.' }).click()
  await rules.getByRole('textbox', { name: 'Business rule' }).fill('We do not sell road or gravel bikes.')
  await rules.getByRole('button', { name: 'Save' }).click()
  await expect(rules.getByText('We do not sell road or gravel bikes.', { exact: true })).toBeVisible()

  const admin = adminClient()
  const { data: stored } = await admin.from('business_rule').select('id, statement, status, created_by, updated_by').eq('organization_id', orgId)
  expect(stored).toEqual([expect.objectContaining({ statement: 'We do not sell road or gravel bikes.', status: 'active', created_by: ownerId, updated_by: ownerId })])
  const ruleId = stored![0]!.id
  const { data: history } = await admin.from('change_log').select('action, changes, actor_user_id, actor_type')
    .eq('table_name', 'business_rule').eq('row_id', ruleId).order('changed_at')
  expect(history).toEqual([
    expect.objectContaining({ action: 'insert', actor_user_id: ownerId, actor_type: 'user' }),
    expect.objectContaining({
      action: 'update', actor_user_id: ownerId, actor_type: 'user',
      changes: expect.objectContaining({ statement: { old: 'We do not sell road bikes.', new: 'We do not sell road or gravel bikes.' } }),
    }),
  ])

  // A member sees the rule but has no controls and cannot change it directly.
  const memberEmail = uniqueEmail('rules-member')
  const memberId = await createConfirmedUser(memberEmail)
  expect((await admin.from('membership').insert({ organization_id: orgId, user_id: memberId, role: 'member' })).error).toBeNull()
  const { client: member } = await userClient(memberEmail, PASSWORD)
  expect((await member.from('business_rule').select('statement')).data).toEqual([{ statement: 'We do not sell road or gravel bikes.' }])
  expect((await member.from('business_rule').insert({ organization_id: orgId, statement: 'Member rule' })).error).not.toBeNull()
  expect((await member.from('business_rule').update({ statement: 'Member edit' }).eq('id', ruleId).select('id')).data ?? []).toEqual([])
  const memberPage = await (await browser.newContext()).newPage()
  await signIn(memberPage, memberEmail)
  await expect(memberPage).not.toHaveURL(/\/sign-in/)
  await memberPage.goto('/business/profile')
  const memberRules = memberPage.getByRole('region', { name: 'Business rules' })
  await expect(memberRules.getByText('We do not sell road or gravel bikes.', { exact: true })).toBeVisible()
  await expect(memberRules.getByRole('button')).toHaveCount(0)

  // Another retailer cannot see or change it, even with the id.
  const otherEmail = uniqueEmail('rules-other')
  const otherId = await createConfirmedUser(otherEmail)
  const otherPage = await (await browser.newContext()).newPage()
  await signIn(otherPage, otherEmail)
  await completeBusiness(otherPage, 'Other Wheels')
  await expect(otherPage).toHaveURL(/\/onboarding\/location$/)
  expect((await organizationFor(otherId)).length).toBe(1)
  const { client: other } = await userClient(otherEmail, PASSWORD)
  expect((await other.from('business_rule').select('id').eq('id', ruleId)).data).toEqual([])
  expect((await other.from('business_rule').update({ status: 'stopped' }).eq('id', ruleId).select('id')).data ?? []).toEqual([])
  expect((await other.from('business_rule').insert({ organization_id: orgId, statement: 'Planted rule' })).error).not.toBeNull()

  // Automated processes (the service role) cannot create or change a rule.
  const planted = await admin.from('business_rule')
    .insert({ organization_id: orgId, statement: 'Inferred: stock road bikes.', created_by: ownerId, updated_by: ownerId } as never)
  expect(planted.error).not.toBeNull()
  expect((await admin.from('business_rule').update({ statement: 'Rewritten by a job' }).eq('id', ruleId)).error).not.toBeNull()

  // Stop using: the rule leaves the list but is kept, with who stopped it.
  await rules.getByRole('button', { name: 'Stop using: We do not sell road or gravel bikes.' }).click()
  await expect(rules).toContainText('No longer using')
  await page.reload()
  await expect(rules).toContainText('No business rules yet.')
  const { data: after } = await admin.from('business_rule').select('statement, status, stopped_by').eq('id', ruleId)
  expect(after).toEqual([{ statement: 'We do not sell road or gravel bikes.', status: 'stopped', stopped_by: ownerId }])
})
