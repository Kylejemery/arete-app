import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/papers/upload-url — mint a short-lived signed upload URL
// into the private 'papers' bucket so the browser can upload a PDF directly
// to Supabase Storage (Vercel routes cap request bodies at ~4.5MB; papers can
// be bigger). The client uploads with uploadToSignedUrl(path, token, file),
// then queues the submission with the returned path. Admin-gated; the bucket
// itself has no policies, so this route is the only way in.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { filename } = await req.json().catch(() => ({ filename: null }))
    // Keep a hint of the original name for the storage browser, but the UUID
    // does the identifying — collisions and weird characters can't hurt us.
    const safe = String(filename || 'paper.pdf')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/\.pdf$/i, '')
      .slice(0, 60)
    const path = `uploads/${crypto.randomUUID()}-${safe}.pdf`

    const admin = createAdminClient()
    const { data, error } = await admin.storage.from('papers').createSignedUploadUrl(path)
    if (error) throw new Error(error.message)

    return NextResponse.json({ path, token: data.token })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create upload URL' },
      { status: 500 }
    )
  }
}
