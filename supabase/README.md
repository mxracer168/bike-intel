# Database

PostgreSQL schema for the platform, managed as Supabase migrations.
Architecture and decisions: [`docs/architecture.md`](../docs/architecture.md).

## Layout

| Path | What |
|---|---|
| `migrations/` | Ordered schema migrations (tables, RLS, triggers) |
| `tests/local/run.sh` | Applies every migration to a throwaway local Postgres and runs the tests |
| `tests/local/supabase_stub.sql` | Minimal stand-in for Supabase roles/auth/storage (tests only) |
| `tests/local/rls_and_integrity.sql` | Tenant-isolation and lifecycle tests |
| `config.toml` | Supabase CLI config for the **local** stack (email confirmation on, 10-character minimum password, no seed data) |
| `templates/confirmation.html` | Confirmation email for the local stack; the live project needs the same template (see below) |

## Run the tests locally

Requires PostgreSQL 15+ server binaries and `psql`:

```bash
supabase/tests/local/run.sh
```

## Apply to the Supabase project

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`db push` applies any migrations the project hasn't run yet, in filename
order. Never edit a migration that has already been applied; add a new one.

## Rules for new migrations

- Enable row-level security on every new table in the same migration
  (the hardening migration fails if any public table lacks it).
- Private tables carry `organization_id` and use composite foreign keys
  `(x_id, organization_id)` when referencing other private rows.
- Money = `monetary_amount` + `currency_code`; quantities = `quantity`;
  timestamps = `timestamptz`; add a local `business_date` where daily
  analysis needs it.
- Keep business logic in application code; database triggers only protect
  records (immutability, lifecycle stamps, audit).
- Server-side jobs use the service role key, which bypasses RLS. It must
  never be sent to a browser.

## Live project settings the app relies on

Set in the Supabase dashboard (not by migrations):

- Authentication → Sign In / Providers → Email: enabled, **Confirm email** on,
  minimum password length **10** (matches `src/domain/auth/password.ts`).
- Authentication → URL Configuration: Site URL `http://localhost:3000`;
  redirect URL `http://localhost:3000/auth/confirm`.
- Authentication → Emails → Confirm signup: use the link from
  `templates/confirmation.html` so confirmation works on any device.
