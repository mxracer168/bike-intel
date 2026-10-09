# Design system

The approved **Buying Platform Visual Direction** artifact is the source of
truth for how the product looks, speaks and behaves. This file records how it
is represented in code and the rules every screen follows.

> **North star: Complexity behind the glass. Clarity in front of it.**
> Clarity is the primary interface objective. Calm and relief are the
> results of giving the retailer clarity. ("Calm over impressive" remains a
> supporting principle.)

## The Figma design reference

A Figma Make project is the visual reference for the application. The rule
when the two disagree:

- **The application decides what the product does**: functionality, useful
  information, controls, data, terminology and product thinking.
- **Figma decides how it looks**: color, typography, spacing, proportions,
  hierarchy, surfaces, borders, shadows, icons, density and layout styling.
- **Figma doesn't win on structure because it looks better.** Where the
  application has useful functionality or information the prototype lacks
  (Inventory's filters, Insights' conclusions), keep it and present it in the
  Figma visual language. Don't keep an inferior visual treatment just
  because it exists, and don't replace a control with a simpler one that
  does less.
- **A genuine conflict is flagged, not decided silently.**

### The visual system (tokens v0.2)

Translated from the Figma Make project's Tailwind values into tokens; the
Make app itself is not copied into this repository.

- **Palette.** Cool slate neutrals on a slate-50 canvas with two faint blue
  glows; one bright blue accent (blue-600). Titles are slate-950
  (`--ink-strong`), body slate-900, secondary slate-600, quiet slate-500.
- **Accessibility substitutions.** Figma's quiet notes are slate-400 (2.6:1 on
  the canvas, fails AA). Text uses `--ink-3` (slate-500, 4.6:1) instead;
  slate-400 (`--ink-faint`) is for chevrons, rules and bar fills only. Status
  text uses the 700 shades (`--pos`, `--con`, `--risk`); the bright 500
  shades are dots (`--dot-*`), never text. On the dark hero, notes use
  slate-300/400 on slate-950, which pass.
- **Type.** Inter 400/500/600. Page title 36/40 (30/36 on phones), -0.035em;
  section heading 18/28; the hero title and band figures 24/32; small
  metadata 12/16.
- **Shape.** Radius 8 / 12 / 16 / 24; the hero and chart panels use 24.
  Controls are 40px tall, white, 12px radius, a hairline border and the
  faintest shadow. Hairlines are slate-200 at 80%.
- **Application shell.** A 288px dark navy sidebar (`--nav-*`): the product
  and the retailer's name on a blue brand tile, icon navigation (24px grid,
  1.7 stroke), the retailer's status and the account at the bottom. A 72px
  translucent top bar with search, notifications and Add context. Below
  1024px the sidebar becomes the phone panel and a 64px bar replaces both.
- **The sidebar network.** A restrained animated network of lines and nodes
  in the sidebar's lower left (`ui/AmbientNetwork.tsx`). It is atmosphere,
  not content: approved for the sidebar only. Nothing else in the product
  gets glowing or animated "intelligence" effects. Still under reduced motion.
- **Shared patterns from the Figma screens.** Section headings are 20px
  600 with one 14px sentence under them; small section labels are uppercase
  metadata in the accent. Panels (the order at a glance, and the health
  figures on Today, Inventory and Insights: `HealthSnapshot variant="panel"`)
  sit on one 70% white surface with a hairline and the faintest shadow, the
  figures inset 28px with short rules between them that don't reach the
  edges (stacked with rules between on phones). A page's status sentence
  (Inventory) sits on a soft status surface: a 50 wash with a 200 hairline
  in the status color (`--pos-wash`/`--pos-line`, `--con-wash`/`--con-line`)
  and a filled round icon. Evidence rows (name, what it covers, the value, a caret)
  open in place and step back from the answer above them. Table header
  bands are uppercase metadata on the canvas color. Focused screens
  (sign-in, onboarding) use a 72px bar with the product tile and an
  optional line under the product name.
- **All-caps metadata.** Allowed only for small metadata and eyebrow labels
  (12px, 600, tracked .15em): the date eyebrow, a status like "Ready for
  review", small section labels like "Questions for you". Never for titles,
  buttons, body text or long labels. *(test: uppercase only alongside
  `--fs-meta`)*

## Where it lives in code

| Piece | File |
|---|---|
| Tokens (color, type scale, spacing, radius, elevation, motion) | `src/design/tokens.css` |
| Base element styles, focus ring, reduced motion | `src/design/base.css` |
| Inter (self-hosted by `next/font`) | `src/design/fonts.ts` |
| Foundational components (CSS Modules, tokens only) | `src/ui/` |
| User-facing copy that is not screen-specific | `src/content/` |

Tokens (v0.2) translate the Figma reference's values; see "The visual
system" above. Token names from v0.1 are kept so components didn't change
meaning, only appearance.

## Foundational components

`Button` (primary / secondary / quiet / danger), `SubmitButton`, `Field`,
`TextInput`, `Select`, `Checkbox`, `ChoiceGroup`, `Page`, `PageHeader`,
`Stack`, `Card`, `Notice`, `Tag`, `FormErrorSummary`, `Toast`, `EmptyState`,
`Skeleton`, `Icon`, `AppShell` (left sidebar: primary navigation, current
retailer, personal account; phone panel via native `<dialog>`), `FocusedShell`,
`ConfidenceMark`, `QuantityStepper`, `ChoiceChips`, `Tabs` (quiet underline
tabs for a page's sub-pages), `ExampleMarker` / `ExampleRegion`.

Feature components: `OrderList` (proposed orders at supplier level, one
comparable row each), `HealthSnapshot` (business health as one panel of figures side by side
with short rules between them, label, a 24px value, an optional note and a small arrow
whose color says whether the change is good for the business, never whether
it went up; Today shows three, Inventory and Insights their own),
`PriorityList` (the first item, whichever it is, is the dark hero: a status
label, the title, one sentence, and the order's figure and free-freight
progress when known; the rest are rows with a status dot, the action label
on hover and a chevron), `WeeklyCheckIn` (Today's right rail, "Questions for
you": the live count and "Answer now", opening the conversation), `IntelligenceProvider` / `AddContextButton` (the
retailer's ongoing conversation with one assistant, speaking as "I", in a
side panel: one continuous thread with no date dividers (click, tap or press
Enter on a message to show when it was sent; the thread is one tab stop,
arrows move between messages); the retailer's words sit right on a faint
surface, replies are plain editorial text with no icon, label or bubble, and
the composer ("Ask or tell me
anything": attach, write, dictate, send) sits directly beneath; below that,
on a full-width soft Harbor blue (`--accent-soft`, meaning "the system needs
something from you"; white answer buttons, charcoal text), "Questions for you" shows one question at a time
("2 of 3") with quick answers, "Tell us more" and "Not now" (while answering
in words, the quick answers step aside for "Back to quick answers" and the
composer shows a short "Answering: Trail tires"), can be
collapsed to a single row ("Questions for you · 3") without dismissing
anything, and is gone entirely when none are open), `AnchoredQuestion`
(a question that could change the current page, e.g. an order: a slim strip
that stays at the bottom of the viewport and settles at the end of the page,
"1 question could change this order", Answer / Dismiss; Answer opens the
quick answers in place and answering resolves the same question everywhere;
Dismiss hides it until the page is loaded again (for now, during review;
later it will stay away for a while), the question stays open in the panel
and check-in; on a phone the strip is one line until Answer),
`OrderReview` (one supplier's order: a compact order bar, the order at a
glance, then the lines as a table of facts: product with a quiet "Why N?",
on hand, on order, the quantity stepper, unit cost and line total; clicking
a row opens its recommendation card in place; see "Order review" below and
`docs/network.md`), `PriorityList`
(Today's priorities: orders, deadlines, stock, sync problems, one row shape; each
row with a destination is one link with a quiet chevron; the retailer can
reorder by dragging a grip that appears on hover/focus, with arrow keys on the
grip, or from a "⋯" menu (always visible on touch); no rank numbers; "Back to
suggested order" appears only once the order has changed), `EvidenceChart`
(weekly sales; single series, per-bar tooltip, screen-reader table),
`InsightsView` (an eyebrow, title and one sentence with the period on the right; performance as a panel of figures; how recent decisions played out as three lesson cards (choose one) above that lesson's decisions, each leading with what happened and then the evidence box: recommended › you approved › demand, and which plan landed closer; patterns and opportunities as cards, conclusion first and facts small; a question the data can't answer sits in the soft Harbor blue of "Questions for you"; see `docs/insights.md`), `InventoryView` (a status sentence, a panel of health figures, one ranked list of bars switched between brand and category and dollars and units that filters the item table, and the item table with a header band, two-line products and a demand mark; see `docs/inventory.md`), `SupplierProfile` (the retailer's standing above the supplier name; about, a row of ordering facts, then roomy program cards with the retailer's Program fit, `4.6 / 5 · Program fit`, and "Why this fit?" opening a pale-blue analysis area; a sticky rail with Your account and Connection; see `docs/suppliers.md` and `docs/programs.md`), `SupplierDirectory`
(instant name search).

Built later with the features that need them: dialogs with undo.

## Three levels of information

Across screens:

| Level | Screen | Question it answers | Shows |
|---|---|---|---|
| 1 | Today | What deserves my attention? | The date, the title and one sentence derived from real state ("Five things deserve your attention." plus "The rest of the business is moving as expected." only when no health figure is going the wrong way); a panel of three health figures; "Priorities", whose first item is the dark hero (positional: it follows the retailer's reordering), the rest quiet rows; "Questions for you" in the right rail (beneath, below 1280px). No line evidence. |
| 2 | Proposed order | What should I buy from this supplier? | Every line, scannable in hundreds. |
| 3 | Line (expanded in place) | Why this quantity? | The reasoning, then the evidence only when asked. |

## Order review

Figma reference: order detail. **This is a decision-making screen, not a
data table:** the order-level intelligence leads, the lines follow, and each
line's reasoning is one click away.

| Part | Shows |
|---|---|
| Order bar | Compact and full-bleed under the top bar, sticky from 1024px: back to Orders, the supplier (18px) with a status pill (Draft / Approved / Submitted), "79 lines · Proposed order"; on the right ORDER TOTAL (exact) and the one action. Below 1024px it scrolls away and the total and action move to the bar along the bottom. |
| The order at a glance | One panel (16px radius, hairline, faint shadow) with thin dividers: Order total (24px, exact; lines, status and ▲/▼ against typical), Freight ($176 away in the caution color, Free over $5,000, a thin progress bar), Typical order ($3,950, Every ~12 days). Only facts that are known. |
| Lines heading | "Recommended lines" (20px) and one sentence; the filters (All / Needs a look / Other retailers) as quiet tabs on the right. |
| Table | One surface with a header band (12px uppercase, tracked) and roomy rows: product (500) with its variant and a quiet "Why N?" under it, on hand, on order, the quantity stepper (changes the total immediately; "was N" under it once changed), unit cost, line total (500). Every data column sorts from its header. Unit cost hides below 1280px, On order below 760px. |
| Opened line | The row washes; beneath it, the recommendation as one card (24px radius): RECOMMENDATION, "Order N" (30px), confidence, the line total at the current quantity, "Add context" (the conversation, about this item); the explanation paragraph; expected demand with a bar showing on hand, already ordered and to order; other retailers when they have it; then the evidence as quiet rows, each opening in place: Demand (a 12-week spark and the weekly average, opening the weekly sales chart), Supply (availability and delivery, opening the supplier's detail), Seasonal trend when there is one, Confidence; other options; and a blue foot band with RECOMMENDED NEXT STEP and the line total ("Back to N" when changed). |
| Other retailers | A blue card inside the opened line: the signal ("2 retailers can cover all 18"), how many are available and Wholesale Market Value once. **The list stays closed until "Show retailers"** (prominence follows relevance, `docs/network.md`); the card is only emphasized when the supplier is out of stock or delayed. |

- Rows carry no status labels, badges or questions: lines that need a look
  are found through "Needs a look", and questions that could change the
  order stay in the anchored strip at the bottom, the panel and the
  check-in.
- **Each fact appears once** at its most useful level.
- Before adding anything to this screen ask: **would a buyer need this while
  scanning 100 lines?** If not, it goes behind the row click.

## The intelligence meeting (onboarding)

Figma reference: Onboarding. A focused screen (no sidebar): the 72px bar
with "Private to {retailer}" and "Finish later".

- **Why it matters, up front:** the equation (historical truth + market
  intelligence + your context = clear recommendations) as one compact strip
  between hairlines, "Your context · We're here" marked.
- **Left (1.55fr): the call, then the conversation.** The call is the hero:
  24px radius, the photo darkening toward the bottom, a "Live" pill top left
  (speaking bars while the advisor talks), the retailer's own video top
  right, captions above the advisor's name plate (bottom left) and the
  controls (bottom right). Under it the conversation: the advisor's lines on
  the left beside the product tile, the retailer's in a quiet bubble on the
  right, each with its time; pinned to the newest line.
- **Right (min 340px): the agenda, then what we're learning.** The agenda
  is a blue card: GETTING TO KNOW {RETAILER} with one sentence, then where
  the conversation is (just covered, now, up next with its one-line intro)
  between rules, and "Full agenda · 6 topics" to see all of it. No step
  counts, time left or progress bars. At the end, scheduling the weekly
  check-in is a white card under it (UP NEXT, "Let's keep this current",
  the recommended slot, one full-width button). What we're learning is a
  blue card of white rows with a check each; the latest three, "View all".
- A footer rule: the presenter controls (example only) and "Continue to
  Today" (dark).
- Stacks below 1280px in the same order: call, conversation, agenda, learning.

## Information budget

Before anything goes on screen, ask: **does this need to be visible before
the user asks for more?** If not, it goes one level down.

- **Decision first, reasons on request.** A recommendation leads with the
  decision; the reasons and evidence wait until the user asks ("Why 4?").
  On order lines there is no one-line reason in between (see "Order review").
- **One reason, one step at a time.** Never several explanations at once.
- **Facts, not prose.** Prefer short facts ("5 sold last October") to
  sentences. Prose only at the deepest level, and only when needed.
- **Prominence follows relevance.** The same information can be quiet or
  raised depending on the situation. Other retailers' stock is a collapsed
  line in an opened order line; it moves up and is set in bold only when the
  supplier is out of stock or delayed (`supplierShort`, `docs/network.md`).
- **Icons sparingly**, and never as a replacement for removed words.
- **Dense by default.** Compact rows, strong alignment, numbers in their own
  columns, no wrapping on desktop, no oversized controls.

## Network prices and reputation

A network price is compared to Wholesale Market Value with a small arrow and
words ("↓ 8% below"), never color alone, and nothing when they're equal.
Gain or loss against average cost is signed text. Reputation is one plain
line ("4.8 ★ · 23 reviews · 79 completed transactions"; "No reviews yet ·
New to the network"): no badges, tiers or ranks. A new term like Wholesale
Market Value gets one quiet (i) explanation where it first appears. See
`network.md`.

## Libraries of connections and similar lists

Status is a small dot and a word (green Connected, gray Not connected,
muted amber Needs attention); cards never change border or fill with
status. Card actions are outlined, never filled blue; secondary actions are
text. Only third-party brand logos carry their own color. Details open in
the standard right-side panel (a full-screen sheet on phones). See
`connections.md`.

## Sortable tables (platform standard)

**Data tables let people sort meaningful columns from the column header.**

- **Interaction:** the first click on a column sorts descending; the next
  ascending; then it keeps toggling. Choosing another column starts that one
  descending.
- **Visible state:** the sorted column's label is in ink with a small arrow
  in the accent color (down for descending, up for ascending). Other
  sortable headers show a faint arrow on hover or keyboard focus, so it's
  clear they sort. Numeric columns keep their labels right-aligned with the
  arrow before the label.
- **Only meaningful columns sort.** Open or expand columns, actions,
  controls, free-text explanations and status words don't.
- **By data type:** numbers, quantities, money and percentages numerically;
  dates chronologically; text alphabetically (numbers within text in
  numeric order). Missing values go last in either direction; ties keep a
  sensible secondary order.
- **The whole dataset:** sort the full filtered set, then page or window it.
  Sorting works alongside every filter and search.
- **Default order:** a table may arrive in a meaningful order of its own
  (priority, review order) with no column marked until one is chosen.
- **Ready-made sorts stay** where they add something the columns can't
  (Excess inventory's "Most money tied up", "Largest gain" by total). They
  share one sort with the headers: choosing a column shows "By column".
- **Accessible:** the header is a button (keyboard and screen reader), and
  the sorted column carries `aria-sort` with its direction.
- **In code:** `SortHeader` (`src/ui/SortHeader.tsx`) and `nextSort` /
  `sortRows` (`src/ui/sorting.ts`). Every table uses them; don't write
  another.

## Top bar: search and notifications

Utilities, not calls to action. Search sits on the left; notifications and
the conversation on the right.

- **Search** opens one dialog from the top bar or with ⌘K / Ctrl K: results
  grouped by kind (pages, orders, suppliers, programs, inventory, products on
  proposed orders, connections, locations), best match first, arrow keys and
  Enter to open. It finds only what exists. Each result goes to where that
  thing lives (an inventory product opens Inventory already searched for
  it; a product on an order opens the order with that line open).
- **Notifications** answer "what changed or needs my attention?", not "what
  should I work on?" (that's Today). A dot on the bell only while
  something is unread; problems first (a connection that stopped working,
  items a supplier can't ship), then programs closing within 30 days, then
  new questions. Each goes to where to act; questions open the
  conversation. Closing the panel marks what was shown as read.

## Rules (enforced where possible)

1. Lead every screen with an answer or a next step. Never a grid of metrics; the
   business health figures are the one exception (a few figures, no charts, no colored tiles).
   On Insights every item reads answer → reason → evidence: the conclusion is the
   largest thing on its line, the facts behind it step back.
2. One primary (blue) button per screen. Everything else secondary or quiet.
3. Tokens only. No raw colors outside `tokens.css`. *(test: `design-rules.test.ts`)*
4. Inter 400/500/600; 12px minimum, and 12px only for metadata; sentence case; all caps only for small metadata labels (above). *(test)*
5. Functional colors only with words, only when the user is actually needed. Red is for genuine problems.
6. Borders before shadows; no nested cards; no pill badges.
7. Speak like an experienced purchasing advisor. No "AI" labels, no jargon (SKU velocity, ROP, WOS, optimization), no sparkles or robots. *(test)*
8. Prefer undo over "are you sure?" dialogs. Button labels say exactly what happens. *(test)*
9. Show uncertainty honestly and ask one question instead of guessing.
10. The left sidebar is the primary application navigation (approved change to the
    original guide, which said "no feature sidebars"): one flat list (Today, Orders,
    Inventory, Programs, Suppliers, Insights, Connections, Business), no section
    headers, one quiet line icon per item, on the dark navy shell. Sub-pages use
    quiet in-page tabs, never a second sidebar. The current retailer and the
    person's own account sit at the bottom of the sidebar.
11. Works on a phone: no sideways scrolling at 375px. *(E2E test)*
12. If a screen feels like more work for the retailer, simplify it before adding anything.
13. Example data is marked "Example data" once per screen (not on every row) when
    real and example data can appear together; while the whole environment is a
    design demo the visible labels are off (`SHOW_EXAMPLE_LABELS` in `ui/Example.tsx`).
    Either way, example data lives only in `src/demo/`, is
    never written to the database, and appears only when `DEMO_PREVIEW` allows it
    (on by default in development, off elsewhere). *(test: `demo-guard.test.ts`)*
14. Subtract before adding: if something doesn't help the person understand, decide
    or act, remove it. Prefer type, spacing and alignment over cards, borders and pills.
15. Reconciliation stays quiet: one muted sync line in the sidebar when all is well. A
    problem becomes a ranked priority on Today, never a banner.
