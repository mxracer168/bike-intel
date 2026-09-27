# Business instructions

Business instructions are the retailer's own long-form guidance about their
business: what they sell and don't, who they prefer to buy from, how and
when they order, what to avoid. It is one document per business, written or
pasted in their own words, like standing instructions to a trusted buyer.

It is the most authoritative thing we know about the business, and the
system must always take it into account when recommending.

## Authority

When deciding what to recommend, knowledge ranks in this order:

1. **Business instructions**: the retailer's explicit, written guidance.
2. **Active context**: what the retailer has told us or confirmed,
   including temporary circumstances ("We're bringing in five road bikes for
   a charity event next month").
3. **Inferred intelligence**: what we've noticed or concluded ("Road cycling
   appears to be growing in this market").
4. **Current operating data**: sales, inventory, supplier availability and
   pricing.

This ranks *authority*, not accuracy. Operating data is factual; it still may
not silently override what the retailer has told us. If the instructions say
"We don't sell road bikes", rising road-bike demand, a supplier promotion, an
industry trend or a model's conclusion must never lead us to recommend
stocking road bikes.

The system may later point out a tension and ask ("Road-bike demand in your
market has grown a lot. Do you want to revisit your instructions about road
bikes?"). The instructions stand until the retailer changes them.

Instructions, context and inference are kept apart. They can disagree ("We
don't sell road bikes" and "We're bringing in five road bikes for a charity
event"); both are kept. Temporary context never rewrites the instructions,
and an inference never changes them. How a conflict affects a recommendation
is future recommendation logic.

## Who controls them

- **Owners and admins** write and edit the instructions, and can see earlier
  versions.
- **Everyone else on the team** reads the current instructions only. Wording
  an owner removed or replaced isn't available to them.
- **Nobody outside the business** can see or change them.
- **Only a person can change them.** Every version is saved by a signed-in
  owner or admin, acting themselves. AI, background jobs, integrations and
  other automated processes cannot create or change the instructions, or act
  in a retailer's name to do so. This is enforced by the database, not only
  by the page.

## Writing them

The editor keeps formatting basic: headings, paragraphs, bulleted and
numbered lists, bold and italic. Pasting from a document keeps that
structure; anything else (tables, links, colors, code) comes in as plain
text. Up to 50,000 characters.

## History

- Every save is a new version: what the instructions said, who saved them and
  when. Nothing is edited in place or deleted.
- Clearing the instructions saves an empty version; earlier versions remain.
- If two people edit at the same time, the second save is refused rather than
  overwriting the first, and they're asked to reload and see the newer
  version.
- Versions are removed only if the whole business's data is deleted on
  request.

A "Previous versions" view isn't built yet; the history is kept from the
first save.

## The document is the source of truth; everything else is derived

The rich-text document the retailer wrote is authoritative. Alongside each
version we keep a plain-text copy for fast retrieval; it is generated from
that version and never edited on its own.

Later, the system may interpret the document into structured rules or
constraints for recommendation logic. Those are **derived**:

- Each interpretation records the exact version it came from.
- When the instructions change, interpretations of earlier versions are stale
  until regenerated, and must not be used as if current.
- They never write back to the document or change it.

## AI may suggest; the retailer decides (future)

The assistant may one day notice something worth adding ("It sounds like you
never stock road bikes. Add that to your business instructions?"). A
suggestion changes nothing by itself. The instructions change only when an
owner or admin makes and saves the edit. Not built yet.

## Recommendations must respect them (future)

Before generating or finalizing a recommendation, the recommendation engine
must read the current instructions (or a current interpretation of them) and
apply what's relevant. Explanations should be able to point to them: "We
didn't recommend road bikes because your business instructions say you don't
sell them." This is part of explainability. Not built yet.

## Scope today

The instructions cover the whole business. A retailer can write about a
specific location, supplier, category or product in their own words ("We
don't stock kids' bikes downtown"); structured scopes for those may come
later, as derived interpretation.

## Where it lives

The Business profile shows **Business instructions** first, then **What we
know about your business** (context and inference). The table is
`business_instructions_version` (append-only), with the view
`business_instructions_current` for the latest version (migration
`20260928000100_business_instructions.sql`).

The earlier `business_rule` table (a list of individual rules, migration
`20260927000100`) is superseded by this document. It exists in the database,
unused: nothing reads or writes it. It can be removed deliberately later.
