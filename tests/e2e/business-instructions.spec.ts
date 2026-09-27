import { expect, test } from '@playwright/test'
import {
  PASSWORD, adminClient, completeAgreements, completeBusiness, completeLocation, createConfirmedUser,
  organizationFor, signIn, uniqueEmail, userClient,
} from './support'

const doc = (text: string) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

/**
 * Business instructions through the real app: an owner writes and edits the
 * document; every save is a new version by that owner; a stale save is refused
 * instead of overwriting; a member reads only the current version; another
 * retailer and the service role can do nothing.
 */
test('owners write business instructions; versions are kept; nobody else can change them', async ({ browser }) => {
  const ownerEmail = uniqueEmail('instructions-owner')
  const ownerId = await createConfirmedUser(ownerEmail)
  const page = await (await browser.newContext()).newPage()
  await signIn(page, ownerEmail)
  await completeBusiness(page, 'Instruction Cycles')
  await completeLocation(page, 'Instruction Main')
  await completeAgreements(page, 'declined')
  const orgId = (await organizationFor(ownerId))[0]!.organization_id

  await page.goto('/business/profile')
  const section = page.getByRole('region', { name: 'Business instructions' })
  await expect(section).toContainText('No instructions yet.')

  // Write the first version with the toolbar.
  await section.getByRole('button', { name: 'Write instructions' }).click()
  const editor = section.getByRole('textbox', { name: 'Business instructions' })
  await editor.click()
  await section.getByRole('button', { name: 'Heading' }).click()
  await page.keyboard.type('What we sell')
  await page.keyboard.press('Enter')
  await page.keyboard.type('We do not sell road bikes.')
  await page.keyboard.press('Enter')
  await section.getByRole('button', { name: 'Bulleted list' }).click()
  await page.keyboard.type('HLC first when pricing is close')
  await section.getByRole('button', { name: 'Save' }).click()
  await expect(section.getByRole('heading', { name: 'What we sell' })).toBeVisible()
  await expect(section).toContainText('Updated')

  // Persists across a reload.
  await page.reload()
  await expect(section.getByText('We do not sell road bikes.')).toBeVisible()
  await expect(section.getByRole('listitem')).toHaveText('HLC first when pricing is close')

  // Edit: a second version by the same owner.
  await section.getByRole('button', { name: 'Edit' }).click()
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('We order twice a month.')
  await section.getByRole('button', { name: 'Save' }).click()
  await expect(section.getByText('We order twice a month.')).toBeVisible()

  const admin = adminClient()
  const { data: versions } = await admin.from('business_instructions_version')
    .select('version, based_on_version, content_text, created_by').eq('organization_id', orgId).order('version')
  expect(versions).toEqual([
    { version: 1, based_on_version: null, created_by: ownerId, content_text: 'What we sell\nWe do not sell road bikes.\n- HLC first when pricing is close' },
    { version: 2, based_on_version: 1, created_by: ownerId, content_text: expect.stringContaining('We order twice a month.') },
  ])

  // A stale editor is refused instead of overwriting a newer save.
  await section.getByRole('button', { name: 'Edit' }).click()
  const { client: owner } = await userClient(ownerEmail, PASSWORD)
  expect((await owner.from('business_instructions_version').insert({
    organization_id: orgId, based_on_version: 2, content: JSON.parse(doc('Saved elsewhere.')), content_text: 'Saved elsewhere.',
  })).error).toBeNull()
  await editor.click()
  await page.keyboard.type(' Stale change.')
  await section.getByRole('button', { name: 'Save' }).click()
  await expect(section.getByRole('alert')).toContainText('Someone else saved changes while you were editing')
  const { count } = await admin.from('business_instructions_version').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
  expect(count).toBe(3)

  // A member reads the current version only, with no controls.
  const memberEmail = uniqueEmail('instructions-member')
  const memberId = await createConfirmedUser(memberEmail)
  expect((await admin.from('membership').insert({ organization_id: orgId, user_id: memberId, role: 'member' })).error).toBeNull()
  const { client: member } = await userClient(memberEmail, PASSWORD)
  expect((await member.from('business_instructions_version').select('version, content_text')).data)
    .toEqual([{ version: 3, content_text: 'Saved elsewhere.' }])
  expect((await member.from('business_instructions_version').insert({
    organization_id: orgId, based_on_version: 3, content: JSON.parse(doc('Member edit')), content_text: 'Member edit',
  })).error).not.toBeNull()
  const memberPage = await (await browser.newContext()).newPage()
  await signIn(memberPage, memberEmail)
  await expect(memberPage).not.toHaveURL(/\/sign-in/)
  await memberPage.goto('/business/profile')
  const memberSection = memberPage.getByRole('region', { name: 'Business instructions' })
  await expect(memberSection.getByText('Saved elsewhere.')).toBeVisible()
  await expect(memberSection.getByRole('button')).toHaveCount(0)

  // Another retailer sees nothing and cannot write.
  const otherEmail = uniqueEmail('instructions-other')
  const otherId = await createConfirmedUser(otherEmail)
  const otherPage = await (await browser.newContext()).newPage()
  await signIn(otherPage, otherEmail)
  await completeBusiness(otherPage, 'Other Spokes')
  await expect(otherPage).toHaveURL(/\/onboarding\/location$/)
  expect((await organizationFor(otherId)).length).toBe(1)
  const { client: other } = await userClient(otherEmail, PASSWORD)
  expect((await other.from('business_instructions_version').select('id').eq('organization_id', orgId)).data).toEqual([])
  expect((await other.from('business_instructions_current').select('version').eq('organization_id', orgId)).data).toEqual([])
  expect((await other.from('business_instructions_version').insert({
    organization_id: orgId, based_on_version: 3, content: JSON.parse(doc('Planted')), content_text: 'Planted',
  })).error).not.toBeNull()

  // Automated processes (the service role) cannot write or rewrite.
  expect((await admin.from('business_instructions_version').insert({
    organization_id: orgId, based_on_version: 3, content: JSON.parse(doc('Inferred')), content_text: 'Inferred',
  })).error).not.toBeNull()
  expect((await admin.from('business_instructions_version').update({ content_text: 'Rewritten' } as never).eq('organization_id', orgId)).error).not.toBeNull()
  const { count: after } = await admin.from('business_instructions_version').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
  expect(after).toBe(3)
})
