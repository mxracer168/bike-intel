# Business rules

Business rules are decisions a retailer has made about their business, stated
in their own words, that the system must respect until the retailer changes
them.

- "We do not sell road bikes."
- "HLC is our preferred distributor when pricing is reasonably close."
- "We only place distributor orders twice a month."
- "This business does not take part in preseason bike bookings."

They are not observations, inferences or temporary circumstances. They are
the retailer's explicit decisions, and the most authoritative thing we know
about the business.

## Authority

When deciding what to recommend, knowledge ranks in this order:

1. **Business rules**: explicit decisions the retailer has made.
2. **Active context**: what the retailer has told us or confirmed,
   including temporary circumstances ("We're bringing in five road bikes for
   a charity event next month").
3. **Inferred intelligence**: what we've noticed or concluded ("Road cycling
   appears to be growing in this market").
4. **Current operating data**: sales, inventory, supplier availability and
   pricing.

This ranks *authority*, not accuracy. Operating data is factual; it still may
not silently override a decision the retailer has made. Rising road-bike
demand, a supplier promotion, an industry trend or a model's conclusion must
never lead us to recommend stocking road bikes to a retailer whose rule says
they don't sell them.

The system may later point out a tension and ask ("Road-bike demand in your
market has grown a lot. Do you want to revisit your rule that you don't sell
road bikes?"). The rule stays in force until the retailer changes it.

## Rules, context and inference stay separate

A rule and a piece of context can disagree. "We don't sell road bikes" and
"We're bringing in five road bikes for a charity event" are both kept, as
different kinds of knowledge. Temporary context never rewrites a rule, and an
inference never changes one. Deciding what a conflict means for a
recommendation is future recommendation logic; the knowledge itself is never
merged or overwritten to make the conflict go away.

## Who controls them

- **Owners and admins** add, reword and stop using rules.
- **Everyone else on the team** can see them.
- **Nobody outside the business** can see or change them.
- **Only a person can make a rule.** Every rule is created, changed or
  stopped by a signed-in owner or admin, acting themselves. AI, background
  jobs, integrations and other automated processes cannot create or change
  a rule, and cannot act in a retailer's name to do so. This is enforced by
  the database, not only by the page.

## AI may suggest; the retailer decides (future)

The assistant may one day notice something that sounds like a rule and ask:
"It sounds like you never stock road bikes. Would you like to add that as a
business rule?" That suggestion is not a rule. It is stored separately, and
the rule exists only once an owner or admin confirms it themselves. Not
built yet.

## Recommendations must respect them (future)

Before generating or finalizing a recommendation, the recommendation engine
must retrieve the business's active rules and apply the relevant ones.
Explanations should be able to name the rule behind a decision: "We didn't
recommend road bikes because your business rules say you don't sell them."
This is part of explainability. Not built yet.

## History

Rules change as businesses change, and recommendations need to be auditable
against the rules in force at the time. So:

- Rewording a rule keeps what it said before, who changed it and when.
- Stopping a rule keeps the rule and records who stopped it and when. It no
  longer applies, but it isn't erased. A stopped rule can't be edited; to
  bring it back, add it again.
- Rules aren't deleted through the product. They go only if the whole
  business's data is deleted on request.

## Scope today

Business rules apply to the whole business. Rules for one location,
supplier, category or product ("We do not stock kids' bikes at the downtown
location") are expected later; their scope model will be designed
deliberately then. Until then, a retailer can still write such a decision as
a business-wide rule in their own words.

## Where it lives

The Business profile shows **Business rules** first, then **What we know
about your business** (context and inference). The table is `business_rule`
(migration `20260927000100_business_rules.sql`); its history is in
`change_log`.
