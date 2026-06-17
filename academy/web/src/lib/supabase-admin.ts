import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client using the SERVICE ROLE key. It bypasses RLS, so
// it must NEVER be imported into a client component or exposed to the browser.
// Used by admin-gated API routes to read backend-only tables (e.g. the corpus
// agent's RLS-locked corpus_ingestion_queue / corpus_ingestion_runs).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client not configured — set SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) in Vercel.'
    )
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
