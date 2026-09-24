import { redirect } from 'next/navigation'

/** Folded into Today. Kept so old links still land somewhere useful. */
export default function RecommendationsRedirect() {
  redirect('/today')
}
