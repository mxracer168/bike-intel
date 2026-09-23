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
`Skeleton`, `Icon`, `AppShell` (top bar, primary navigation, account menu),
`FocusedShell`.

Built later with the features that need them: recommendation card, "Why?"
disclosure, quantity stepper, confidence dots, tables, charts, advisor note,
dialogs with undo.

## Rules (enforced where possible)

1. Lead every screen with an answer or a next step, as a sentence. Never a grid of metrics.
2. One primary (Harbor blue) button per screen. Everything else secondary or quiet.
3. Tokens only. No raw colors outside `tokens.css`. *(test: `design-rules.test.ts`)*
4. Hanken Grotesk 400/600, 500 for 13px labels; 13px minimum; sentence case; no all caps. *(test)*
5. Functional colors only with words, only when the user is actually needed. Red is for genuine problems.
6. Borders before shadows; no nested cards; no pill badges.
7. Speak like an experienced purchasing advisor. No "AI" labels, no jargon (SKU velocity, ROP, WOS, optimization), no sparkles or robots. *(test)*
8. Prefer undo over "are you sure?" dialogs. Button labels say exactly what happens. *(test)*
9. Show uncertainty honestly and ask one question instead of guessing.
10. Primary navigation: Today, Orders, Programs, Suppliers. Account and settings live in the account menu.
11. Works on a phone: no sideways scrolling at 375px. *(E2E test)*
12. If a screen feels like more work for the retailer, simplify it before adding anything.
