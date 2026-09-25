# The retailer intelligence assistant

Each retailer has one private, persistent intelligence conversation. In it the
retailer can:

1. **Tell** us about the business ("We're closed the first week of January").
2. **Ask** about the business ("When did I last order from Northline?").
3. **Answer** the questions we need answered to make better recommendations.

All three happen in the same conversation. It's one relationship, not
separate tools. The weekly check-in is a scheduled way back into that same
conversation, not a new one.

## What is stored where

| Table | Holds | Is not |
|---|---|---|
| `intelligence_message` | The conversation as it happened: what the retailer told or asked, written answers, attachments, check-in markers, and (later) the assistant's replies. Append-only; never rewritten. | The memory. Nothing reads it as fact without interpretation. |
| `intelligence_question` | What we want to learn: prompt, quick-answer choices, why we're asking, priority, scope and lifecycle (`open` → `answered` / `deferred` / `withdrawn`). A quick answer is stored here (`answer_choice`) and is not a message. | Conversation. |
| `context_item` | What we have learned, structured: the statement, scope (organization, location, supplier relationship, category, product, program, order), lifespan (evergreen, seasonal, temporary), stated or inferred, confidence, review or expiry date, who provided it, and the source message or file. | Written today. It is filled only by real interpretation, later. |
| `document` | Original files (PDF, image, spreadsheet, text), kept as uploaded, with uploader and time. | Interpreted. The conversation says so. |

The Business profile's "What we know about your business" shows
`context_item`, never raw conversation.

## Questions

- **One question, many places.** A question shown in the panel, during an
  order review, on Insights (when an outcome can't be explained by the data;
  see `insights.md`) or in the weekly check-in is the same `intelligence_question`
  row. Answering it anywhere resolves it everywhere (`answer_intelligence_question`),
  so it isn't asked again.
- **Rare and earned.** A question exists only if the answer could change a
  recommendation, assumption or decision. At most three are shown at once.
- **Quick answers stay structured**, on the question. **"Tell us more"**
  answers are written words, so they are also part of the conversation.
- **"Not now" defers**: the question comes back at the next check-in (for now,
  a week later). Only the system retires a question (`withdrawn`).
- **Weekly check-in** ("There are three things we'd like to check with you
  this week") draws from the same prioritized question queue. Scheduling is
  not built.

## Answering questions (future): retrieve, don't dump

The model must **never** receive an unrestricted dump of the retailer's
database to reason over. The shape is:

```
retailer's question
  → model works out what is being asked (intent + parameters)
  → application runs specific, authorized retrievals for that intent
  → model explains the retrieved result, citing where it came from
```

- **Retrievals are application code**: named, typed operations such as "last
  purchase order for supplier X", "stock unsold for 90 days", "spend by
  supplier for a period", "what the retailer told us about Y". The model
  chooses among them and fills their parameters; it does not write queries.
- **Tenant scope is not the model's job.** Every retrieval runs as the
  signed-in user (row-level security applies) and takes the organization from
  the user's membership, never from the model or the request. A retrieval can
  never return another retailer's private data.
- **Structured sources** (when built): purchase orders, sales, inventory,
  supplier relationships and terms, supplier programs, recommendations,
  `context_item`, locations, supplier catalog data.
- **Unstructured sources** (later): the conversation history, uploaded PDFs,
  supplier documents, images, spreadsheets. Semantic search, if added, is
  one more scoped retrieval, not a way around scope.

### Best source of truth

Answer factual questions from the authoritative record, not from memory of
the conversation. "When was my last Northline order?" reads orders, even if
the retailer mentioned an order in conversation. "What did I tell you about
Cedar Ridge?" reads the conversation and `context_item`. When sources
disagree, say so and prefer the system of record (see the sources-of-truth
table in `architecture.md`).

### Honest limits

The assistant says when it doesn't know, and why, instead of guessing:

- "I don't have enough order history to answer that yet."
- "I can see your POS purchase orders, but not Northline's side of them."
- "Your sales history starts June 12."

Coverage facts (`sync_coverage`, first sale date, connected sources) are
retrievals too, so these answers are grounded. Until answering exists, the
panel says so under any question the retailer asks: "We can't answer
questions yet. It's saved here."

## Interpreting the conversation (future)

Turning messages and files into `context_item` rows is a separate, explicit
step. Each item records its source message or document, who provided it,
when, scope, lifespan, stated vs inferred, confidence and a review or expiry
date. The original message or file is never changed. Inferred items are shown
as inferred and can be confirmed or rejected by the retailer.

## System priority and the retailer's order

Today's priorities have two orders, kept apart on purpose:

- **System priority**: what we believe matters most, as ranked by the
  application. It is never overwritten by the retailer's choices.
- **User order**: how the retailer chooses to work through the list. It is
  layered on top (`features/work/order.ts`): a list of item ids; items it
  doesn't mention keep their system position.

Today the user order is kept only in the browser (`localStorage`, per
retailer). To persist it, store per person and retailer: the item key (stable
across days, e.g. `order:<purchase order id>`), the chosen position, and when
it was set, alongside the system rank at that moment.

**Reordering is a signal.** Moves are behavioral data worth keeping: which
system-ranked items people consistently move up, move down or defer. When
persistence is built, record each move (item key, system rank, from, to, when)
as an append-only event, separate from the current order, so the ranking can
later learn from it. No learning is built yet.

## Voice

The device's own dictation only (phone keyboards, operating-system
dictation). The app does not send retailer audio to a browser speech service.
Our own transcription, when it exists, runs server-side under the same
privacy rules as the conversation.

## Not built yet

Model orchestration, the retrieval layer, semantic/vector search, document
interpretation, context extraction, scheduled check-ins, calendar sync,
background jobs, voice transcription.
