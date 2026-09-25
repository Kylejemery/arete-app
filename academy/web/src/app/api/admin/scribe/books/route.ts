import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { createBook, listBooks } from '@/lib/scribe/book-store'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/books — every book that is not archived, newest
// activity first, with chapter and word counts.
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    const books = await listBooks(createAdminClient())
    return NextResponse.json({ books })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load books' }, { status: 500 })
  }
}

// POST /api/admin/scribe/books — { title }.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { title } = await req.json().catch(() => ({}))
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }
  try {
    const book = await createBook(createAdminClient(), title.trim().slice(0, 200))
    return NextResponse.json({ book })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to create the book' }, { status: 500 })
  }
}
