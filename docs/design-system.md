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
on a quieter surface, "Questions for you" shows one question at a time
("2 of 3") with quick answers, "Tell us more" and "Not now" (while answering
in words, the quick answers step aside for "Back to quick answers" and the
composer shows a short "Answering: Trail tires"), can be
collapsed to a single row ("Questions for you · 3") without dismissing
anything, and is gone entirely when none are open), `InlineQuestion`
(the same question shown where it matters; answered once),
`OrderReview` (one supplier's order as a dense table;
each line expands to answer → reason, evidence only on request), `WorkList`
(Today's ranked priorities: orders, deadlines, stock, sync problems, one row shape), `EvidenceChart`
(weekly sales; single series, per-bar tooltip, screen-reader table),
`SupplierProfile` (identity + ordered typed sections), `SupplierDirectory`
(instant name search).

Built later with the features that need them: dialogs with undo.

## Three levels of information

| Level | Screen | Question it answers | Shows |
|---|---|---|---|
| 1 | Today | What deserves my attention? | A small health snapshot and one ranked priority list; an order appears as one priority (what it needs, lines, estimate). No line evidence. |
| 2 | Proposed order | What should I buy from this supplier? | Every line: product, on hand, on order, quantity, cost, what needs a look. |
| 3 | Line (expanded in place) | Why this quantity? | "Order 6", one reason; evidence (sales, stock, season, supplier stock, confidence, assumptions, alternatives) only when asked. |

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
