import { describe, expect, it } from 'vitest'
import { attachmentPath, attachmentProblem, formatBytes, MAX_ATTACHMENT_BYTES } from '@/domain/intelligence/attachments'

describe('conversation attachments', () => {
  it('accepts PDFs, images, spreadsheets and text documents', () => {
    for (const type of ['application/pdf', 'image/png', 'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']) {
      expect(attachmentProblem({ size: 10, type })).toBeNull()
    }
  })

  it('refuses empty, oversized and unsupported files, in plain words', () => {
    expect(attachmentProblem({ size: 0, type: 'application/pdf' })).toBe('That file is empty.')
    expect(attachmentProblem({ size: MAX_ATTACHMENT_BYTES + 1, type: 'application/pdf' })).toBe('That file is larger than 20 MB.')
    expect(attachmentProblem({ size: 10, type: 'application/x-msdownload' })).toMatch(/^Add a PDF/)
  })

  it('stores files inside the organization folder, never under the raw file name', () => {
    const path = attachmentPath('org-1', 'doc-1', '../../other-org/evil name.PDF')
    expect(path).toBe('org-1/intelligence/doc-1/original.pdf')
  })

  it('formats sizes for people', () => {
    expect(formatBytes(1_300_000)).toBe('1.2 MB')
    expect(formatBytes(340_000)).toBe('332 KB')
  })
})
