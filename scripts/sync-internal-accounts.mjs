// Marks every email in config/internal-accounts.ts as internal
// (profiles.is_internal = true) through the set_internal_accounts RPC.
// Never unmarks. Placeholders (no @) are skipped.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-internal-accounts.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'config', 'internal-accounts.ts'), 'utf8');
const block = src.slice(src.indexOf('INTERNAL_ACCOUNT_EMAILS'), src.indexOf('];'));
const emails = [...block.matchAll(/'([^']+)'/g)].map(m => m[1].trim().toLowerCase()).filter(e => e.includes('@'));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/rpc/set_internal_accounts`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_emails: emails }),
});
if (!res.ok) {
  console.error(`set_internal_accounts failed: ${res.status}`);
  process.exit(1);
}
console.log(`Marked internal: ${await res.json()} profile(s) from ${emails.length} listed email(s).`);
