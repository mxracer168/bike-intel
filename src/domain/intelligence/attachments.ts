/** What the conversation accepts as an attachment. Checked on the server. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

const ALLOWED: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Image',
  'image/png': 'Image',
  'image/heic': 'Image',
  'image/webp': 'Image',
  'text/csv': 'Spreadsheet',
  'application/vnd.ms-excel': 'Spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Spreadsheet',
  'text/plain': 'Text',
  'application/msword': 'Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Document',
}

/** For the file picker's accept attribute. */
export const ATTACHMENT_ACCEPT = [...Object.keys(ALLOWED), '.csv', '.xlsx', '.xls', '.pdf', '.txt', '.docx', '.heic'].join(',')

export function attachmentKind(mime: string | null | undefined): string | null {
  return (mime && ALLOWED[mime]) ?? null
}

/** Plain reason a file can't be added, or null when it's fine. */
export function attachmentProblem(file: { size: number; type: string }): string | null {
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'That file is larger than 20 MB.'
  if (!attachmentKind(file.type)) return 'Add a PDF, image, spreadsheet or text document.'
  return null
}

/** Storage key: always inside the organization's own folder; never the raw file name. */
export function attachmentPath(organizationId: string, documentId: string, fileName: string): string {
  const ext = (fileName.match(/\.([a-z0-9]{1,8})$/i)?.[1] ?? 'bin').toLowerCase()
  return `${organizationId}/intelligence/${documentId}/original.${ext}`
}

/** "1.2 MB", "340 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
