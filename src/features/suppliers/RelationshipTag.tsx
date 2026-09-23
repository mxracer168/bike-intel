import { Tag } from '@/ui/Feedback'
import type { RelationshipView } from './presentation'

/** The retailer's own relationship, in words. Nothing shown when there is none. */
export function RelationshipTag({ relationship }: { relationship: RelationshipView }) {
  if (relationship.status === 'none') return null
  if (relationship.status === 'inactive' || relationship.status === 'suspended') return <Tag>Not buying currently</Tag>
  if (relationship.preference === 'preferred') return <Tag tone="positive">Preferred supplier</Tag>
  return <Tag tone="info">You buy from them</Tag>
}
