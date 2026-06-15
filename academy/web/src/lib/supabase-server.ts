import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cookie-based Supabase client for Route Handlers / Server Components.
// Mirrors the auth setup in middleware.ts so route handlers can read the
// signed-in user from the request cookies. The browser singleton lives in
// '@/lib/supabase'.
export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll can throw when called from a Server Component; the
          // middleware already refreshes the session, so this is safe to ignore.
        }
      },
    },
  })
}
