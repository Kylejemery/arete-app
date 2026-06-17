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

// LinkedIn has no Buffer-style scheduling via its API — posts publish immediately.
// Posts directly as the member identified by LINKEDIN_AUTHOR_URN.
async function postToLinkedIn(text: string): Promise<void> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const author = process.env.LINKEDIN_AUTHOR_URN
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN not configured')
  if (!author) throw new Error('LINKEDIN_AUTHOR_URN not configured')

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`LinkedIn API ${res.status}: ${await res.text()}`)
  }
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

  if (!posts?.length) {
    return NextResponse.json({ error: 'No posts provided' }, { status: 400 })
  }

  const scheduledAt = buildScheduledAt(scheduleTime)
  let scheduled = 0
  const errors: string[] = []

  for (const post of posts) {
    // LinkedIn posts directly via the LinkedIn API, not Buffer.
    if (post.platform === 'linkedin') {
      try {
        await postToLinkedIn(post.text)
        scheduled++
        await supabase.from('scheduled_posts').insert({
          platform: 'linkedin',
          text: post.text,
          scheduled_at: null,
          schedule_type: 'Posted now (LinkedIn direct)',
          created_at: new Date().toISOString(),
        }).then(() => {})
      } catch (e) {
        errors.push(`linkedin: ${e instanceof Error ? e.message : String(e)}`)
      }
      continue
    }

    // Everything else goes through Buffer.
    if (!token) {
      errors.push(`${post.platform}: Buffer token not configured — add BUFFER_ACCESS_TOKEN`)
      continue
    }

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
