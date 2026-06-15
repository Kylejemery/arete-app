import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Map our platform keys to Buffer profile IDs stored in env vars
// You'll fill these in after connecting accounts in Buffer
const BUFFER_PROFILE_IDS: Record<string, string | undefined> = {
  x:         process.env.BUFFER_PROFILE_X,
  linkedin:  process.env.BUFFER_PROFILE_LINKEDIN,
  instagram: process.env.BUFFER_PROFILE_INSTAGRAM,
  threads:   process.env.BUFFER_PROFILE_THREADS,
  bluesky:   process.env.BUFFER_PROFILE_BLUESKY,
  facebook:  process.env.BUFFER_PROFILE_FACEBOOK,
}

function buildScheduledAt(scheduleTime: string): string | null {
  if (scheduleTime === 'Post now' || scheduleTime === 'Best time (Buffer decides)') return null
  const now = new Date()
  const match = scheduleTime.match(/(Today|Tomorrow) at (\d+)(am|pm)/i)
  if (!match) return null
  const [, when, hourStr, ampm] = match
  if (when === 'Tomorrow') now.setDate(now.getDate() + 1)
  let hour = parseInt(hourStr)
  if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12
  if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0
  now.setHours(hour, 0, 0, 0)
  return now.toISOString()
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { posts, scheduleTime } = await req.json()
  const token = process.env.BUFFER_ACCESS_TOKEN

  if (!token) {
    return NextResponse.json({ error: 'Buffer token not configured — add BUFFER_ACCESS_TOKEN to your env vars' }, { status: 500 })
  }

  if (!posts?.length) {
    return NextResponse.json({ error: 'No posts provided' }, { status: 400 })
  }

  const scheduledAt = buildScheduledAt(scheduleTime)
  let scheduled = 0
  const errors: string[] = []

  for (const post of posts) {
    const profileId = BUFFER_PROFILE_IDS[post.platform]
    if (!profileId) {
      errors.push(`No Buffer profile ID configured for ${post.platform}`)
      continue
    }

    const body: Record<string, unknown> = {
      profile_ids: [profileId],
      text: post.text,
    }

    if (scheduleTime === 'Post now') {
      body.now = true
    } else if (scheduledAt) {
      body.scheduled_at = scheduledAt
    }
    // else: let Buffer pick the best time

    try {
      const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`,
        },
        body: new URLSearchParams(
          Object.entries(body).map(([k, v]) => [k, String(v)])
        ),
      })

      if (res.ok) {
        scheduled++
        // Optionally log to Supabase for post history
        await supabase.from('scheduled_posts').insert({
          platform: post.platform,
          text: post.text,
          scheduled_at: scheduledAt || null,
          schedule_type: scheduleTime,
          created_at: new Date().toISOString(),
        }).then(() => {}) // non-blocking, ignore errors if table doesn't exist yet
      } else {
        const err = await res.text()
        errors.push(`${post.platform}: ${err}`)
      }
    } catch (e) {
      errors.push(`${post.platform}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (scheduled === 0) {
    return NextResponse.json({
      error: 'No posts were scheduled',
      details: errors,
    }, { status: 500 })
  }

  return NextResponse.json({ scheduled, errors })
}
