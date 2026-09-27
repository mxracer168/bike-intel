import type { ReactNode } from 'react'
import type { InstructionsDoc } from '@/domain/instructions/document'

type PmJson = { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: PmJson[] }

function children(n: PmJson): ReactNode {
  return n.content?.map((c, i) => <Block key={i} node={c} />)
}

function Text({ node }: { node: PmJson }) {
  let out: ReactNode = node.text ?? ''
  for (const m of node.marks ?? []) {
    if (m.type === 'bold') out = <strong>{out}</strong>
    if (m.type === 'italic') out = <em>{out}</em>
  }
  return <>{out}</>
}

function Block({ node }: { node: PmJson }) {
  switch (node.type) {
    case 'text': return <Text node={node} />
    case 'hardBreak': return <br />
    case 'paragraph': return <p>{children(node)}</p>
    // The section title is an h2, so document headings sit below it.
    case 'heading': return node.attrs?.level === 3 ? <h4>{children(node)}</h4> : <h3>{children(node)}</h3>
    case 'bulletList': return <ul>{children(node)}</ul>
    case 'orderedList': return <ol start={typeof node.attrs?.start === 'number' ? node.attrs.start : undefined}>{children(node)}</ol>
    case 'listItem': return <li>{children(node)}</li>
    default: return <>{children(node)}</>
  }
}

/**
 * The instructions as read, rendered from the stored document structure. No
 * HTML is ever stored or injected; only the allowed formatting is drawn.
 */
export function InstructionsContent({ doc }: { doc: InstructionsDoc }) {
  return <Block node={doc as PmJson} />
}
