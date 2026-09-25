# Design system

The approved **Buying Platform Visual Direction** artifact is the source of
truth for how the product looks, speaks and behaves. This file records how it
is represented in code and the rules every screen follows.

> **North star: Complexity behind the glass. Clarity in front of it.**
> Clarity is the primary interface objective. Calm and relief are the
> results of giving the retailer clarity. ("Calm over impressive" remains a
> supporting principle.)

## Where it lives in code

| Piece | File |
|---|---|
| Tokens (color, type scale, spacing, radius, elevation, motion) | `src/design/tokens.css` |
| Base element styles, focus ring, reduced motion | `src/design/base.css` |
| Hanken Grotesk (self-hosted by `next/font`) | `src/design/fonts.ts` |
| Foundational components (CSS Modules, tokens only) | `src/ui/` |
| User-facing copy that is not screen-specific | `src/content/` |

Tokens are copied exactly from the artifact's v0.1 token block. A few
additions come from the artifact's own component styles: `--accent-pressed`,
`--accent-underline`, `--risk-line`, `--inverse`/`--on-inverse`/`--inverse-link`
(toasts), `--on-accent`, `--page-width`, `--gutter`, `--font-mono`.

## Foundational components

`Button` (primary / secondary / quiet / danger), `SubmitButton`, `Field`,
`TextInput`, `Select`, `Checkbox`, `ChoiceGroup`, `Page`, `PageHeader`,
`Stack`, `Card`, `Notice`, `Tag`, `FormErrorSummary`, `Toast`, `EmptyState`,
`Skeleton`, `Icon`, `AppShell` (left sidebar: primary navigation, current
retailer, personal account; phone panel via native `<dialog>`), `FocusedShell`,
`ConfidenceMark`, `QuantityStepper`, `ChoiceChips`, `Tabs` (quiet underline
tabs for a page's sub-pages), `ExampleMarker` / `ExampleRegion`.

Feature components: `OrderList` (proposed orders at supplier level, one
comparable row each), `HealthSnapshot` (Today's few figures), `WeeklyCheckIn` (one optional line
back into the conversation), `IntelligenceProvider` / `AddContextButton` (the
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
anything, and is gone entirely when none are open), `InlineQuestion`
(the same question shown where it matters; answered once),
`OrderReview` (one supplier's order as a plain table of facts: product, on
hand, on order, order quantity, cost; no reasons, labels, icons or questions
in rows; clicking a row opens "Order N" and one short reason and the controls, then "Why N?"
for a full-width analysis (chart and sentence, key facts, assumptions and
options); other retailers are one collapsed line; see "Order review" below and
`docs/network.md`), `PriorityList`
(Today's priorities: orders, deadlines, stock, sync problems, one row shape; each
row with a destination is one link with a quiet chevron; the retailer can
reorder by dragging a grip that appears on hover/focus, with arrow keys on the
grip, or from a "⋯" menu (always visible on touch); no rank numbers; "Back to
suggested order" appears only once the order has changed), `EvidenceChart`
(weekly sales; single series, per-bar tooltip, screen-reader table),
`SupplierProfile` (identity + ordered typed sections), `SupplierDirectory`
(instant name search).

Built later with the features that need them: dialogs with undo.

## Three levels of information

Across screens:

| Level | Screen | Question it answers | Shows |
|---|---|---|---|
| 1 | Today | What deserves my attention? | A small health snapshot and one ranked priority list; an order appears as one priority (what it needs, lines, estimate). No line evidence. |
| 2 | Proposed order | What should I buy from this supplier? | Every line, scannable in hundreds. |
| 3 | Line (expanded in place) | Why this quantity? | The reasoning, then the evidence only when asked. |

## Order review

**The default order table is operational facts only. Recommendation context
must be requested by the user.** A buyer may review hundreds of lines; the
table has to scan like a plain list.

| Level | When | Shows |
|---|---|---|
| Default table | Always | Product description, on hand, on order, order quantity, cost. Nothing else: no reason, proof, confidence, supplier status, delivery, retailer availability, attention labels, icons, badges or questions. |
| Row clicked | The buyer opens a line | A light strip across the full width: one short reason ("Busier season ahead."), the quantity control, "Why 4?" and, if any, the other-retailers signal. No heading: the quantity is already in the table and the control. |
| Why | "Why 4?" | A full-width analysis: the weekly sales chart with one sentence under it on the left (about 60%, left open); key facts on the right (sales pace, on hand, supplier stock, delivery, season, confidence) as label and value on a white surface with a thin outline; "What we assumed" and "Other options" underneath, side by side, below a hairline. Stacked on a phone. |
| Other retailers | Separate, collapsed | One line ("3 retailers have some ›"); the list only when clicked, never open by default. Placed under the reason, and bolder, only when the supplier is out of stock or delayed. |

- Lines that need a look are found through the "Needs a look" filter, not
  by labeling rows. Questions that could change a recommendation stay in the
  intelligence-question system (shown once above the table, in the panel or
  the check-in), never inside a row.
- **Each fact appears once** at its most useful level: the quantity in the
  table and the control (no "Order 4" heading); pace, stock, supplier and
  delivery as key facts (the sentence under the chart doesn't repeat them,
  and delivery isn't listed again as an assumption).
- Structure comes from layout, hairlines and at most a white surface with a
  thin outline (key facts, the retailer list). No cards in cards, no shadows,
  no icons beyond the turning caret.
- Part numbers are left out for now.
- Before adding anything to this screen ask: **would a buyer need this while
  scanning 100 lines?** If not, it goes behind the row click or behind
  "Why".

## Information budget

Before anything goes on screen, ask: **does this need to be visible before
the user asks for more?** If not, it goes one level down.

- **Decision → reason → proof → more.** When a recommendation is shown, it
  leads with the decision, then one short reason, then (on request) the
  evidence. On screens built for scanning, even the reason waits for a click
  (see "Order review").
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

## Rules (enforced where possible)

1. Lead every screen with an answer or a next step, as a sentence. Never a grid of metrics; Today's
   health snapshot is the one exception (at most five figures, plain text, no tiles or charts).
2. One primary (Harbor blue) button per screen. Everything else secondary or quiet.
3. Tokens only. No raw colors outside `tokens.css`. *(test: `design-rules.test.ts`)*
4. Hanken Grotesk 400/600, 500 for 13px labels; 13px minimum; sentence case; no all caps. *(test)*
5. Functional colors only with words, only when the user is actually needed. Red is for genuine problems.
6. Borders before shadows; no nested cards; no pill badges.
7. Speak like an experienced purchasing advisor. No "AI" labels, no jargon (SKU velocity, ROP, WOS, optimization), no sparkles or robots. *(test)*
8. Prefer undo over "are you sure?" dialogs. Button labels say exactly what happens. *(test)*
9. Show uncertainty honestly and ask one question instead of guessing.
10. The left sidebar is the primary application navigation (approved change to the
    original guide, which said "no feature sidebars"): one flat list (Today, Orders,
    Inventory, Programs, Suppliers, Insights, Business), no section headers, no
    icons. Keep it visually quiet so Today stays the obvious home. Sub-pages use
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
