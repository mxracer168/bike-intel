# Connections

Connections is where a retailer connects the systems and suppliers the
business already uses: a point-of-sale system (Lightspeed Retail, Shopify)
and suppliers (HLC, QBP, JBI, Shimano, SRAM, distributors). Later the same
library can hold accounting or commerce.

The page is a visual demo today (`src/demo/connections.ts`). Nothing
connects, no credential is stored or sent, and every action says so.

## The experience

**Complexity behind the glass.** The retailer sees a library of cards, each
with a logo, a name, a type, one sentence, a status and one button:

| Status | Shown as |
|---|---|
| Connected | Green dot, "Connected" |
| Not connected | Gray dot, "Not connected" |
| Needs attention | Muted amber dot, "Needs attention", and the reason in words inside the panel |

- Cards look the same whether connected or not: no colored borders, no
  filled buttons. Connect and Manage are outlined; "View details" is text.
- Brand logos may carry their own color. Nothing else on the page does.
- Search and the filters (All, Connected, Point of sale, Suppliers) work
  locally. "Connected" includes connections that need attention.
- Every connection opens the same panel: a right-side drawer on desktop, a
  full-screen sheet on phones, with Overview, Settings and Sync history.
- The panel URL is shareable: `/connections?connection=hlc`. A supplier's
  page links its "Manage connection" here.

### Overview, connected

1. **Connection**: status in words ("Connected via API") and the last sync.
   Anything more technical (next sync, endpoints, rate limits) is secondary
   and goes to Sync history or Settings.
2. **Data access**: what this provider actually gives us, with neutral
   checks.
3. **Order submission**: enabled or not, in one sentence.
4. **Credentials**: masked. The full secret never reaches the page, so a
   masked value is never copyable. Non-secret identifiers (an HLC caller
   name, an account number) can be copied.
5. **Actions**: Test connection, Reconnect, and Disconnect (quiet danger,
   with a confirmation).

### Overview, not connected: the first run

What you'll get (the capabilities), then how to connect as 2–3 plain steps,
then at most one field and one button. The retailer never picks a
"connection method": the provider decides it and the steps say what to do.

## Connection methods

The method belongs to the provider, sometimes to the retailer's account
with that provider. The UI never assumes one.

| Method | What the retailer does | Example |
|---|---|---|
| OAuth | Signs in to the provider and approves access | Lightspeed Retail, Shopify |
| API token | Creates a token in the provider's portal and pastes it here | HLC, QBP |
| API (account-linked) | Enters an account number; the provider approves | A distributor with a partner API |
| Email order submission | Nothing: we email approved orders to the order desk | Suppliers without an API |
| File export / import | Receives or sends price, stock and order files | JBI (demo) |
| Copy to portal | We prepare the order; the retailer enters it on the supplier's site | Portal-only suppliers |
| Manual | The retailer orders as they do today; we still use catalog data if available | Brands with no dealer integration yet |

**HLC does not offer OAuth.** HLC uses a dealer API access token plus an
application identifier (caller name). Setup is guided: what's needed, where
to create the token in the HLC dealer account, paste it, test, save,
connected. Verify the exact steps against HLC's current dealer API
documentation before building. The same honesty applies to every provider:
setup steps describe that provider's real method.

## Capabilities vary by provider

Never imply that every provider offers everything. Each connection lists
only what that provider gives for this retailer's account:

- **Point of sale:** sales, inventory by location, items and costs,
  purchase history. Some offer customers; not all offer transfers.
- **Suppliers:** catalog and product data, inventory, the retailer's own
  pricing, order submission, order status, invoices and account data, ship-to
  addresses. Many offer only some of these.

Features that depend on a capability (sending orders, network availability,
dealer pricing) check the connection's capabilities, never the provider's
name.

## Architecture (not built)

One shared UI; provider-specific behavior behind it. A connection record:

| Field | Meaning |
|---|---|
| provider | Which provider (`hlc`, `lightspeed`, …), from a provider registry |
| provider type | Point of sale, supplier, later accounting or commerce |
| connection method | OAuth, API token, API, email, file, portal, manual |
| organization | The retailer that owns it. Private by default. |
| location scope | Optional: the locations this account covers (a POS per store, a supplier account per ship-to) |
| auth state | Pending, active, expired, revoked. Secrets live server-side only, encrypted, never sent to the browser. |
| capabilities | What this provider offers this account, as discovered or configured |
| sync state | Idle, running, failed, with a schedule |
| last sync | When the last successful sync finished |
| error state | The last problem in plain words, plus a technical detail for support |
| config | Provider-specific settings (caller name, endpoints, file formats, email destination) |

The provider registry holds each provider's name, logo, type, supported
methods, setup steps and possible capabilities. Adding a provider is a
registry entry and an adapter, not a new screen.

Not built yet: OAuth flows, token exchange, secret storage, sync jobs,
webhooks, provisioning, POS import, real connection tests.

## Logos

Provider logos live in `public/logos/`. The HLC mark (`hlc.svg`) is a vector
redrawn from the logo image supplied for the demo; replace it with HLC's official file
when available. Providers without a logo get a quiet initials tile.
