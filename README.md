# Buying Intelligence (working title)

Buying intelligence for independent retailers, starting with specialty bicycle retail.

> Complexity behind the glass. Clarity in front of it.

- Architecture and decisions: [`docs/architecture.md`](docs/architecture.md)
- Visual and voice system: [`docs/design-system.md`](docs/design-system.md)
- Database and migrations: [`supabase/README.md`](supabase/README.md)

## Run locally

Requires Node.js 20.9+ (22 recommended).

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values from your Supabase project.
3. `npm run dev`, then open http://localhost:3000

## Checks

| Command | What it runs | Needs |
|---|---|---|
| `npm run lint` / `npm run typecheck` | ESLint, TypeScript | nothing |
| `npm test` | Unit tests (domain rules, design and voice rules) | nothing |
| `npm run test:db` | All migrations + RLS/integrity tests on a throwaway Postgres | PostgreSQL 15+ binaries |
| `npm run build && npm run check:secrets` | Production build; secret key absent from browser bundles | nothing |
| `npx playwright test --project=public` | Public pages: accessibility, phone layout, redirects, headers | a build |
| `E2E_SUPABASE=1 npx playwright test` | Sign-up, onboarding, tenant isolation | a **local** Supabase stack (`supabase start`) |

CI (`.github/workflows/ci.yml`) runs all of these on every push. The full
end-to-end suite refuses to run against anything but a local Supabase stack;
never point it at the live project.
