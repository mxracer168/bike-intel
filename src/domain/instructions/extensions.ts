import StarterKit from '@tiptap/starter-kit'

/**
 * The only formatting business instructions can hold: headings, paragraphs,
 * bulleted and numbered lists, bold and italic (plus line breaks). Shared by
 * the editor and by the server, which validates every save against it, so
 * anything else in pasted content (tables, links, colors, code) is dropped.
 */
export const instructionExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: false,
  }),
]
