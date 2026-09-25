# Activation run B: decisions, 2026-09-25

This file records the judgement calls made while carrying out Run B without stopping to ask. Each entry gives what was chosen, why, and what the alternative was. Run A's decisions are in `2026-09-25-activation.md`.

## Process

**DB0.1 Branch.**
- **Chosen:** Run B is committed on the same session branch as Run A, `claude/optimistic-fermat-xyt1j9`, one commit per Part (`Part BN:`), and pushed once at the end.
- **Where it lands:** the open draft PR Kylejemery/arete-app#272. It has not merged, so Run B stacks on it (see Run A D0.1).
- **Alternative:** push to `main`, which the session harness does not permit.

**DB0.2 Run A's output.** Run A shipped every Part and skipped none.
- **Support card:** it exists (`components/SupportCard.tsx`, `web/src/components/SupportCard.tsx`), and B5 reuses it.
- **Events:** Run A added no `app_events` table. It applied and uses `product_events`.
- **Admin exclusions:** Run A's admin-excluding queries were one-off backfills inside applied migrations. They are not re-run.

## B1

**DB1.1 Who is seeded as internal.**
- **Seeded:** the admin, plus every profile whose email, handle or display name contains "test". That is 5 accounts, applied as a rule in the migration and also listed by email in `config/internal-accounts.ts`.
- **Placeholders:** Aundrea and Devon are placeholders, as the prompt asked, even though profiles that look like theirs exist.
- **Not marked:** the other non-admin account named "Kyle" has a different surname in its email, so it is not marked. The report asks Kyle to confirm it.
- **Alternative:** mark every name match. That risks excluding a real user.

**DB1.2 "Every query that excludes is_admin".**
- **What the search found:** no code outside the admin auth checks filters on `is_admin` for measurement.
- **Instead:**
  - The migration adds `measured_profiles`, which excludes both admin and internal accounts, for every metric, dashboard and backfill.
  - `CLAUDE.md` gains a convention saying so.
  - The admin Email tab tags internal recipients.
  - Every count in Runs B and C excludes both.
- **Why internal accounts stay in the mailing counts:** those counts are who can be mailed, not a metric, and internal accounts keep full functionality.

**DB1.3 Clients cannot change `is_internal`.** The 2026-08-25 lockdown grants the authenticated role UPDATE only on named columns, and this is not one of them. Verified: `has_column_privilege` returns false.
