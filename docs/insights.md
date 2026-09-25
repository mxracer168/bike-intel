# Insights

Today is operational, Orders is transactional, Inventory is the current
state. **Insights is retrospective**: what the business is teaching us over
time. It follows one loop:

**Measure → Notice → Ask → Learn.**

## The page

- **Performance**: did we buy about the right amount? Three cards
  (matched demand, ran short, sat too long) and "How recent decisions
  played out": for each reviewed purchase, our recommendation, what the
  buyer approved and actual demand, grouped under *Where your judgment
  mattered*, *Where recommendations helped* and *Where we can improve*, with
  one constructive sentence each.
- **Patterns worth noticing**: a few meaningful observations, each with one
  or two facts and, rarely, an action or a question.
- **Opportunities**: things the retailer might otherwise miss (a program
  that fits, a position worth deepening, stock worth reviewing, a retailer
  who may want your excess). Insights, not a work queue.
- **System learning** is the mechanism underneath, not a section: it
  connects outcomes, the retailer's decisions, questions, context and
  future recommendations.

Example data only today (`src/demo/insights.ts`). The period and location
controls don't change it yet. None of the metric definitions are final.

## Tone: learning together, never grading

The product measures disagreement rigorously and presents it
constructively. It says so when its own recommendation was wrong ("We
underestimated demand for kids' bikes in August"), and when the buyer's
judgment helped ("Your increase for the service season matched demand
better than our recommendation"). It never says the retailer was wrong to
change a recommendation, and it's never a self-congratulating scorecard or a
leaderboard.

## Agreement is not outcome

The system keeps these separately, always:

- the original recommendation
- the buyer's changes
- the approved quantity
- the submitted quantity
- the actual outcome (sales, stock, stockouts, aging)

A buyer can disagree and be right; the recommendation can be right; both
can miss; the difference can be immaterial. Agreement with the
recommendation is never counted as success on its own.

## Meaningful deviations, not noise

**Insights identify meaningful deviations, not merely interesting
statistics.** Ordinary variation is absorbed into forecasting without
bothering the retailer (expected 10 kids' bikes, sold 11: just update the
expectation). The system considers asking for context only when:

- the deviation is materially large (expected 10, sold 21),
- the financial impact is meaningful,
- the pattern persists,
- it may affect future recommendations, and
- the structured data it has can't explain what happened.

Most patterns are simply reported. A question is asked only when knowing
*why* could materially improve future decisions.

## Questions come from the same system

An Insights question is not a separate kind of conversation. It is an
`intelligence_question` like any other (see `intelligence.md`): the same
unresolved question can appear in Insights, the intelligence panel, the
weekly check-in, Today (if important enough) or a relevant order, and
answering it anywhere resolves it everywhere. The kids'-bike example on the
page is one of the example questions in the panel.

## From answers to context

Answers are conversation; what we learn from them is structured context
(`context_item`), with its own lifespan. The system should tell apart, for
example:

| The retailer says | Likely context |
|---|---|
| "The elementary school runs a bike-to-school program every August." | Recurring, seasonal |
| "We sponsored a kids' race." | An event; may recur |
| "A competitor nearby closed." | Lasting change |
| "We brought in a new brand customers really liked." | Assortment change |
| "A nonprofit bought 12 bikes for a one-time giveaway." | One-time; explains history, shouldn't raise next year's forecast |
| "Nothing specific. It was just unusually busy." | Noise; no new context |

Raw conversation and history are not the same thing as structured retailer
intelligence. Interpreting answers into context is a separate, explicit
step (not built).

## The learning loop (future)

Outcome → meaningful deviation detected → unresolved question created →
retailer provides context → structured context created or updated →
future recommendation uses that context → later outcomes test whether the
assumption was useful.

The system learns from the recommendation, the retailer's adjustment, the
approved and submitted quantities, the sales, inventory, stockout and aging
outcomes, the retailer's explanation, seasonality, location and supplier or
program context. The goal isn't to decide who was right; it's to understand
what produced the best outcome and recommend better next time.

## Not built

Forecasting, recommendation scoring and accuracy formulas, anomaly
detection, significance testing, context extraction, LLM analysis,
automatic question generation, confidence calibration, opportunity finding,
and any calculation from real sales or orders.
