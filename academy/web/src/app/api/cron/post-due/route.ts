import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { postDirect } from '@/lib/social'

export const dynamic = 'force-dynamic'

// Fires scheduled posts whose time has come. Called by the Railway cron trigger
// with a shared CRON_SECRET (not a user session). Reads/updates the RLS-locked
// post_queue with the service role and posts via the same lib/social posters.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Admin client unavailable' },
      { status: 500 }
    )
  }

  const { data: due, error } = await admin
    .from('post_queue')
    .select('id, platform, text')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(25)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  for (const row of due ?? []) {
    try {
      await postDirect(row.platform, row.text)
      await admin
        .from('post_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', row.id)
      sent++
    } catch (e) {
      await admin
        .from('post_queue')
        .update({ status: 'failed', error_message: e instanceof Error ? e.message : String(e) })
        .eq('id', row.id)
      failed++
    }
  }

  return NextResponse.json({ processed: (due ?? []).length, sent, failed })
}
