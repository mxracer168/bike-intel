import { expect, test, type Page } from '@playwright/test'
import {
  PASSWORD, adminClient, completeAgreements, completeBusiness, completeLocation, createConfirmedUser,
  organizationFor, signIn, uniqueEmail, userClient,
} from './support'

async function onboard(page: Page, email: string, name: string) {
  await signIn(page, email)
  await completeBusiness(page, name)
  await completeLocation(page, `${name} Main`)
  await completeAgreements(page, 'declined')
}

async function openConversation(page: Page) {
  await page.getByRole('button', { name: 'Add context' }).first().click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByLabel('Message')).toBeEnabled()
  return panel
}

/**
 * The retailer's intelligence conversation is stored per organization, is
 * still there after leaving and coming back, and never crosses retailers:
 * not the messages, not the attached files, not the questions.
 */
test('the intelligence conversation persists and stays inside its retailer', async ({ browser }) => {
  const emailA = uniqueEmail('talk-a')
  const emailB = uniqueEmail('talk-b')
  const idA = await createConfirmedUser(emailA)
  const idB = await createConfirmedUser(emailB)
  const pageA = await (await browser.newContext()).newPage()
  const pageB = await (await browser.newContext()).newPage()
  await onboard(pageA, emailA, 'Alpha Talk')
  await onboard(pageB, emailB, 'Bravo Talk')
  const orgA = (await organizationFor(idA))[0]!.organization_id
  const orgB = (await organizationFor(idB))[0]!.organization_id

  // A says something, closes the panel, comes back later: it's still there.
  let panel = await openConversation(pageA)
  await panel.getByLabel('Message').fill('We close for inventory the first week of January.')
  await panel.getByLabel('Message').press('Enter')
  await expect(panel.getByText('We close for inventory the first week of January.')).toBeVisible()
  await pageA.keyboard.press('Escape')
  await pageA.reload()
  panel = await openConversation(pageA)
  await expect(panel.getByText('We close for inventory the first week of January.')).toBeVisible()

  // A attaches a file: the original is kept, and nothing claims it was read.
  await panel.locator('input[type=file]').setInputFiles({ name: 'sizes.csv', mimeType: 'text/csv', buffer: Buffer.from('size,count\nM,4\n') })
  const fileLink = panel.getByRole('link', { name: 'sizes.csv' })
  await expect(fileLink).toBeVisible()
  await expect(panel.getByText('We haven’t read it yet.').first()).toBeVisible()
  const href = (await fileLink.getAttribute('href'))!
  expect((await pageA.request.get(href)).status()).toBe(200)

  const admin = adminClient()
  const { data: docs } = await admin.from('document').select('id, storage_path, organization_id, uploaded_by').eq('organization_id', orgA)
  expect(docs).toHaveLength(1)
  expect(docs![0]!.storage_path.startsWith(`${orgA}/intelligence/`)).toBe(true)
  expect(docs![0]!.uploaded_by).toBe(idA)

  // B sees none of it, through the app or directly.
  panel = await openConversation(pageB)
  await expect(panel.getByText('We close for inventory the first week of January.')).toHaveCount(0)
  await expect(panel.getByRole('link', { name: 'sizes.csv' })).toHaveCount(0)
  expect((await pageB.request.get(href)).status()).toBe(404)

  const { client: b } = await userClient(emailB, PASSWORD)
  expect((await b.from('intelligence_message').select('id').eq('organization_id', orgA)).data).toEqual([])
  expect((await b.from('document').select('id').eq('organization_id', orgA)).data).toEqual([])
  expect((await b.storage.from('documents').download(docs![0]!.storage_path)).error).not.toBeNull()
  const intrude = await b.from('intelligence_message').insert({
    organization_id: orgA, author_type: 'retailer', author_user_id: idB, kind: 'text', body: 'hello from B',
  })
  expect(intrude.error).not.toBeNull()
  const smuggle = await b.from('intelligence_message').insert({
    organization_id: orgB, author_type: 'retailer', author_user_id: idB, kind: 'attachment', document_id: docs![0]!.id,
  })
  expect(smuggle.error).not.toBeNull()

  // A question asked by the system is answered once, by A only.
  const { data: question } = await admin.from('intelligence_question').insert({
    organization_id: orgA, prompt: 'Will the new Cedar Ridge trails open before spring?',
    choices: ['Yes, this spring', 'Not sure yet', 'No'], priority: 80,
  }).select('id').single()
  const stolen = await b.rpc('answer_intelligence_question', { p_question_id: question!.id, p_choice: 'No', p_body: null })
  expect(stolen.error).not.toBeNull()

  await pageA.keyboard.press('Escape')
  await pageA.reload()
  panel = await openConversation(pageA)
  await panel.getByRole('group', { name: 'Will the new Cedar Ridge trails open before spring?' })
    .getByRole('button', { name: 'Not sure yet' }).click()
  await expect(panel.getByText('You answered: Not sure yet')).toBeVisible()
  const { data: answered } = await admin.from('intelligence_question').select('status, answered_by').eq('id', question!.id).single()
  expect(answered).toEqual({ status: 'answered', answered_by: idA })

  // Nothing was turned into structured context behind the retailer's back.
  const { count } = await admin.from('context_item').select('id', { count: 'exact', head: true }).eq('organization_id', orgA)
  expect(count).toBe(0)
})
