/**
 * EXAMPLE CONVERSATION for the onboarding call prototype (/demo/onboarding).
 * Never written to the database. A scripted conversation with Papa Wheelies,
 * a fictional specialty bicycle retailer; nothing here is classified or
 * extracted by a system. The learned facts are what interpretation could
 * produce later, labeled the way the screen should treat them.
 */
import type { OnboardingScript } from '@/features/onboarding-call/script'

export const papaWheelies: OnboardingScript = {
  retailer: 'Papa Wheelies',
  topics: [
    { id: 'business', label: 'Your business' },
    { id: 'riders', label: 'Customers & riders' },
    { id: 'buying', label: 'Buying approach' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'seasons', label: 'Seasonality' },
    { id: 'different', label: 'What makes your store different' },
  ],
  lines: [
    { id: 'l1', speaker: 'advisor', topic: 'business',
      text: 'So Papa Wheelies is a single shop with a full service department. Did I get that right?' },
    { id: 'l2', speaker: 'retailer', topic: 'business', completes: ['business'],
      text: 'That’s us. One store, and service is a big part of what we do.',
      learned: [{ id: 'k1', kind: 'context', text: 'One specialty bicycle shop with a full service department' }] },
    { id: 'l3', speaker: 'advisor', topic: 'riders',
      text: 'Before we start looking at inventory, I’d like to understand how Papa Wheelies actually works. What kinds of riders are most important to your business?' },
    { id: 'l4', speaker: 'retailer', topic: 'riders',
      text: 'Mostly mountain and gravel riders. We do recreational bikes too, but road isn’t really our thing.',
      learned: [
        { id: 'k2', kind: 'context', text: 'Mountain and gravel are core categories' },
        { id: 'k3', kind: 'context', text: 'Recreational bikes also matter' },
      ] },
    { id: 'l5', speaker: 'advisor', topic: 'riders',
      text: 'That’s helpful. Are there any categories you’ve deliberately decided not to stock?' },
    { id: 'l6', speaker: 'retailer', topic: 'riders',
      text: 'We don’t stock road bikes. We’ll special order one if somebody specifically wants it, but we don’t carry them.' },
    // The follow-up that matters: a firm rule and a current habit are stored differently.
    { id: 'l7', speaker: 'advisor', topic: 'riders',
      text: 'Is that a firm business decision, or would you want me to reconsider it if local demand changed?' },
    { id: 'l8', speaker: 'retailer', topic: 'riders', completes: ['riders'],
      text: 'It’s firm. We’d rather be great at mountain and gravel than average at everything.',
      learned: [
        { id: 'k4', kind: 'instruction', text: 'Road bikes are not normally stocked' },
        { id: 'k5', kind: 'context', text: 'Special orders are fine for committed customers' },
      ] },
    { id: 'l9', speaker: 'advisor', topic: 'buying',
      text: 'Got it. I’ll treat that as a rule, not a trend. When you buy, what matters more: having everything on the wall, or keeping inventory moving?' },
    { id: 'l10', speaker: 'retailer', topic: 'buying',
      text: 'Turns, honestly. Cash gets tight in winter. I’d rather run out of a few things than sit on a wall of tires.',
      learned: [{ id: 'k6', kind: 'context', text: 'Healthy inventory turns matter more than carrying every available product' }] },
    // Mid-conversation demo state opens here.
    { id: 'l11', speaker: 'advisor', topic: 'buying',
      text: 'That makes sense. Do you commit to preseason orders with your main suppliers, or mostly reorder as things sell?' },
    { id: 'l12', speaker: 'retailer', topic: 'buying', completes: ['buying', 'suppliers'],
      text: 'Preseason with Northline for the big stuff, then we reorder every week or two. Summit is mostly for suspension service parts.',
      learned: [
        { id: 'k7', kind: 'context', text: 'Preseason orders with Northline, then reorders every week or two' },
        { id: 'k8', kind: 'context', text: 'Summit Parts Supply mainly for suspension service parts' },
      ] },
    // Not everything said is business intelligence: a question about the product.
    { id: 'l13', speaker: 'retailer', topic: 'suppliers',
      text: 'Quick question. Can I change any of this later?' },
    { id: 'l14', speaker: 'advisor', topic: 'suppliers',
      text: 'Anytime. Just tell me, the same way you are now. And your business instructions are always yours to edit.' },
    { id: 'l15', speaker: 'advisor', topic: 'seasons',
      text: 'Are there times of year that change things for you, beyond the usual spring rush?' },
    { id: 'l16', speaker: 'retailer', topic: 'seasons', completes: ['seasons'],
      text: 'There’s a big mountain bike race here at the end of October. That weekend is huge for us. And tourists from May through August, mostly gravel riders.',
      learned: [
        { id: 'k9', kind: 'temporary', text: 'A major mountain bike race brings riders to town', when: 'End of October' },
        { id: 'k10', kind: 'seasonal', text: 'Tourism lifts gravel demand', when: 'May through August' },
      ] },
    { id: 'l17', speaker: 'advisor', topic: 'different',
      text: 'Last one for today. What makes Papa Wheelies different from other shops nearby?' },
    { id: 'l18', speaker: 'retailer', topic: 'different', completes: ['different'],
      text: 'Our service department. People come to us for suspension work, and they buy parts while they’re here.',
      learned: [{ id: 'k11', kind: 'context', text: 'Service work drives parts sales' }] },
    // Wrap-up.
    { id: 'l19', speaker: 'advisor', topic: 'different',
      text: 'That’s a great start. I have a much better picture of how Papa Wheelies buys, what matters to you, and where you want me to be cautious.' },
    { id: 'l20', speaker: 'advisor', topic: 'different',
      text: 'One of the ways I’ll keep recommendations useful is by checking in now and then about things your sales history can’t tell me. A race coming to town, construction out front, a new shop opening nearby, a promotion you’re planning.' },
    { id: 'l21', speaker: 'advisor', topic: 'different',
      text: 'A short weekly conversation is usually enough. Would Monday mornings work? It’s before most of your orders go out.' },
  ],
  startAt: 11,
  wrapAt: 18,
  checkIn: { day: 'Mondays', time: '10:00 AM', reason: 'Before most of your weekly orders go out' },
}
