# Supplier programs and Program fit

Suppliers publish programs (booking programs, pre-season discounts, service
parts programs) on their pages. For each program the retailer sees a
**Program fit**: how well that program appears to fit *their* business.

## Principle

**Program fit is always retailer-specific.** A high score means the program
appears beneficial for that retailer, based on their own sales history,
inventory, supplier relationship and terms, business context, seasonality
and relevant industry intelligence. It answers "How well does this program fit
me?", never "How good is this program in general?".

**Supplier commercial relationships with the platform must never increase a
retailer's Program fit score.** No payment, sponsorship, placement fee or
partnership changes a score or its explanation. This is stated to the
retailer under every explanation.

## How it's shown

- On the program card, beside the closing date: `4.6 / 5 · Program fit`.
  The program name, season and summary stay first; the score is visible but
  quieter. No stars, rings, gauges, colors or badges, nothing that reads like
  a public review, and never an ordinal rank ("#2") on a supplier page.
- "Why this fit?" (a text button) opens the explanation in the card:
  "Why this is a 4.6 fit for {retailer}", the band in words, the three to
  five main factors in plain language (a short title and one sentence each),
  and the trust statement. Factors, not the equation: weights and formulas
  are never shown to the retailer; methodology belongs in help and internal
  documentation.
- Bands, shown only inside the explanation so the card stays quiet:

  | Score | Words |
  |---|---|
  | 4.5–5.0 | Exceptional fit |
  | 4.0–4.4 | Strong fit |
  | 3.0–3.9 | Worth considering |
  | below 3.0 | Limited fit |

- Fit is not part of the supplier's own page content
  (`SupplierPresentation`); it's the retailer's, passed separately
  (`features/suppliers/programFit.ts`).

## Today

Example values only (`src/demo/suppliers.ts`, `demoProgramFit`), for the
demo suppliers. Real supplier pages show no fit yet. Nothing is computed or
stored.

## Later (not built)

- **Programs page ordering.** The Programs page may sort or prioritize the
  programs a retailer is eligible for by their Program fit, e.g.
  Winter service parts 4.8, Tire pre-season 4.4, Spring booking 3.2. The
  supplier page shows the score, not the rank.
- **Scoring.** A fit comes from factors such as demand for the program's
  categories, timing against the retailer's seasonality, the economics
  against their normal terms, the size of the commitment against their
  sell-through, and their relationship with the supplier. It's computed per
  retailer, under that retailer's tenant scope, and kept with the factors
  that produced it so the explanation always matches the number.
- **Supplier view.** Suppliers ask a different question: "How attractive is
  this program across the eligible retailer population?" Future supplier
  analytics may show anonymized aggregates only, e.g. "42% of eligible
  retailers received a Program fit of 4.5 or higher", with minimum group
  sizes so no retailer can be singled out. Retailer-specific scores and the
  data behind them are never shown to suppliers.
