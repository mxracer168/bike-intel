# Supplier pages

A supplier page answers: who is this supplier, how do I reach them, what are
the ordering terms, what programs do they offer, how well do those fit my
business, and how does Buying Intelligence connect to them.

## Layout

- **Identity**: the retailer's standing above the name ("Preferred
  supplier", "Your supplier", or "Not currently a supplier"), then the name.
  No tagline, type, markets or website in the header.
- **Main column**: a short About, one quiet row of ordering facts, then
  **Programs** (with "Upload program"), the main reason to come back. Brands
  aren't listed: some suppliers carry hundreds, and product search will
  answer "who carries this brand?" better.
- **Rail** (sticky on desktop, stacked on smaller screens): **Your account**
  (account number with copy, website, sales rep, customer service) and
  **Connection** (how we reach this supplier, in plain words).

## Public vs private

The supplier's own page content (`SupplierPresentation`: about, ordering
facts, programs, public contacts) is separate from what belongs to the
retailer (`features/suppliers/account.ts`) and is never visible to the
supplier or to other retailers:

- account number, pricing, payment terms and ordering history
- supplier preference and relationship status
- connection configuration
- Program fit, which is personalized to the retailer and never influenced by
  supplier payments or sponsorship (see `programs.md`)

## Connections

Suppliers differ in how orders and data move. The page names the current
mode in retailer-friendly words; the technical setup lives behind
"Manage connection" and never appears on the page itself (no keys or
credentials):

| Mode | Shown as |
|---|---|
| API | Connected via API: inventory, pricing and orders sync automatically; last synced |
| Email | Orders sent by email |
| Portal | Copy to supplier portal |
| File | File export and import |
| None | Manual ordering |

"Manage connection" opens that supplier's connection on the Connections
page (`/connections?connection=<id>`), where credentials, order submission
and sync live. See `connections.md`.

## Uploading programs

"Upload program" on a supplier page sends the file with that supplier as
context. When reading programs is built, the system still inspects the
document for supplier, brand, dates, terms, thresholds, discounts and
delivery windows, and asks the retailer to confirm if the supplier it finds
doesn't match the page.

Later, a **global upload** entry point should accept a program from anywhere
in the app, recognize the supplier or brand it belongs to, and route it
there.

Today the button only accepts a file locally and says it can't be read yet;
nothing is uploaded or parsed. Account details and connection status are
example data.
