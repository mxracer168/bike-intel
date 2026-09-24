import { redirect } from 'next/navigation'

/** Folded into Insights. Kept so old links still land somewhere useful. */
export default function PerformanceRedirect() {
  redirect('/insights')
}
