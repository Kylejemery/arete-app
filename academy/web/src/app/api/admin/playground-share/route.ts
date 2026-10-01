import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  DEFAULT_SHARE_DAYS,
  MAX_SHARE_DAYS,
  SHARE_PARAM,
  isPiecePath,
  signShareToken,
} from '@/lib/playground-share'

export const dynamic = 'force-dynamic'

// POST /api/admin/playground-share — make a private link to one Playground
// piece. Body: { piece: 'kosmopolis', days?: 30 }. The link opens that piece
// alone, for anyone holding it, until it expires; middleware.ts checks it.
// Nothing is stored, so there is no list of links to show or revoke one by
// one: rotating PLAYGROUND_SHARE_SECRET revokes them all.

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === process.env.ADMIN_EMAIL
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.PLAYGROUND_SHARE_SECRET) {
    return NextResponse.json({ error: 'PLAYGROUND_SHARE_SECRET is not set on this deployment' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const piece = typeof body.piece === 'string' ? body.piece.trim().replace(/^\/+|\/+$/g, '') : ''
  if (!isPiecePath(piece)) {
    return NextResponse.json({ error: 'Piece must be a path below /playground/, like kosmopolis' }, { status: 400 })
  }
  const days = body.days === undefined ? DEFAULT_SHARE_DAYS : Number(body.days)
  if (!Number.isInteger(days) || days < 1 || days > MAX_SHARE_DAYS) {
    return NextResponse.json({ error: `Days must be a whole number from 1 to ${MAX_SHARE_DAYS}` }, { status: 400 })
  }

  const expires = Math.floor(Date.now() / 1000) + days * 86400
  const token = await signShareToken(piece, expires)
  if (!token) return NextResponse.json({ error: 'Could not sign the link' }, { status: 500 })

  const url = new URL(`/playground/${piece}`, request.url)
  url.searchParams.set(SHARE_PARAM, token)
  return NextResponse.json({ url: url.toString(), expiresAt: new Date(expires * 1000).toISOString() })
}
