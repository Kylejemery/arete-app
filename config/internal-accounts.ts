// Internal accounts: Kyle, family, and test logins. Flagged with
// profiles.is_internal so analytics, metrics, admin dashboards and backfills
// can leave them out. The flag affects measurement only; these accounts keep
// every product feature.
//
// To apply changes to this list, run:
//   node scripts/sync-internal-accounts.mjs
// (needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY). The script marks every
// listed email internal and never unmarks anyone.
//
// Seeded 2026-09-25 (activation run B, Part B1) with the admin email and every
// profile whose email, handle or name contained "test".

export const INTERNAL_ACCOUNT_EMAILS: string[] = [
  // Admin
  'kemery9585@gmail.com',

  // Test and demo logins ("test" in the email, handle or display name)
  'demo@pursuearete.com',
  'quakebooksraleigh@gmail.com',
  'cosp@tester.com',
  'tester@pursuearete.com',
  'tester2@pursuearete.com',

  // Family
  'aundrea.c.emery@gmail.com',
  'devon.e.emery@gmail.com',
];

// Rules applied in the database as well as the list above: any profile
// whose email, handle or display name contains one of these (case
// insensitive) is internal.
export const INTERNAL_NAME_PATTERNS: string[] = ['test'];
