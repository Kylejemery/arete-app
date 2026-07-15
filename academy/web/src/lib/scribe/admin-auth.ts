import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Same admin gate every /api/admin/* route in this app uses (session email
// must equal ADMIN_EMAIL), packaged once for the Scribe routes. Returns null
// when authorized, or the 401 response to return.
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
