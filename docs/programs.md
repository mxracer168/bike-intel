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
- "Why this fit?" (a text button) opens the explanation at the bottom of the
  card, on a full-width pale Harbor-blue analysis area below a subtle
  divider (no accent stripe). The blue means "analysis you opened", for every score;
  it never signals a good fit. A low fit is never red, never a warning, never
  an icon: it's decision support, not an alert. Inside:
  "Why this is a 4.6 fit for {retailer}", the three to
  five main factors in plain language (a short title and one sentence each,
  two columns on wide screens), optionally one sentence weighing them when
  they pull in different directions, and the trust statement (including that
  another retailer may see a different fit for the same program). Factors, not the equation: weights and formulas
  are never shown to the retailer; methodology belongs in help and internal
  documentation.
- No band labels ("Exceptional fit" and the like): the number and the
  reasons are enough, and a label turns fit into a grade.
- Fit is not part of the supplier's own page content
  (`SupplierPresentation`); it's the retailer's, passed separately
  (`features/suppliers/programFit.ts`).

## Today

Example values only (`src/demo/suppliers.ts`, `demoProgramFit`), for the
demo suppliers. Northline shows the full range on one page: 4.6, 4.2 and a
2.1 "Complete Bike Early Commitment", a sound program that is a limited fit
for this retailer (large, early commitment against current stock). Real supplier pages show no fit yet. Nothing is computed or
stored.

## The Programs pages

- **Programs** (`/programs`): every program the retailer can see, best
  Program fit first (programs without a fit after, by name). One card each:
  supplier and name, the fit, the estimated benefit, then commitment and
  closing date. The supplier page shows the score, never the rank.
- **A program** (`/programs/{id}`): supplier and closing date, the name,
  season and delivery; the assessment (fit, a one-line verdict, the
  estimated benefit, commitment, payment terms and cash impact, with
  "Why this fit?" opening the same reasons and trust statement as the
  supplier page); the decision brief (the strongest reasons for and
  against); and negotiating points.
- **Negotiating points**: the retailer picks the changes that matter and adds
  a note; "Prepare feedback" writes a plain message to their rep, which
  they copy or open in their own email (`mailto:`, addressed to the rep
  when the supplier page lists one). Nothing is stored or sent for them.
- **Real data** (`src/domain/programs`): the retailer's own programs and the
  ones suppliers publish, as row-level security allows. A published program
  the retailer has confirmed as the same as their own copy shows once, as
  their copy. The terms come from the newest confirmed version, else the
  newest draft (marked as not yet checked). Real programs have no fit or
  analysis yet, so their page shows the stored terms and says fit isn't
  available. Example programs (`src/demo/programs.ts`) carry the demo
  suppliers' fit and a hand-written analysis.
- Not built: building a program order from the page (the Figma design's
  "Build program order"), which waits on program orders.

## Later (not built)
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
