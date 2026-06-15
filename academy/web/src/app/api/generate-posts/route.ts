import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PLATFORM_RULES: Record<string, string> = {
  x:         'Max 280 chars. Punchy hook on first line. A single strong insight, question, or adapted quote. No hashtags. No em-dashes.',
  linkedin:  '150-400 chars. Professional but personal. First line is a hook. 2-3 short paragraphs. Invite reflection at the end. No hashtags.',
  instagram: '80-150 char caption that is evocative and visual, then a blank line, then 6-8 relevant hashtags each on its own line starting with #.',
  threads:   'Max 500 chars. Conversational, first-person, feels like a genuine thought not a marketing post.',
  bluesky:   'Max 300 chars. Intellectual community tone. Can be more philosophical and direct. No hashtags.',
  facebook:  '100-250 chars. Warm and community-oriented. Invites a response or reflection from followers.',
}

export async function POST(req: NextRequest) {
  // Auth check — only the admin user can call this
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic, sourceType, platforms } = await req.json()

  if (!topic || !platforms?.length) {
    return NextResponse.json({ error: 'Missing topic or platforms' }, { status: 400 })
  }

  const platformInstructions = platforms
    .map((p: string) => `${p}: ${PLATFORM_RULES[p] || 'Keep it concise and engaging.'}`)
    .join('\n')

  const system = `You are a content strategist for "Arete" — a Stoic philosophy personal growth app and Substack publication by Kyle Emery.

Voice: Thoughtful, grounded, intellectually rigorous. You draw on Marcus Aurelius, Epictetus, Seneca, and Pierre Hadot. Not motivational-poster shallow — genuine Stoic philosophy at depth, made accessible. The audience is serious readers who have moved past beginner Stoicism.

Generate platform-optimized social posts for the given content. Return ONLY a valid JSON object with the platform names as keys. No markdown fences, no preamble, no explanation.

Platform rules:
${platformInstructions}`

  const userMsg = `Source type: ${sourceType}
Content/topic: ${topic}
Platforms needed: ${platforms.join(', ')}

Write posts for each platform and return as JSON.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMsg }],
    })

    const raw = message.content.find(b => b.type === 'text')?.text || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const content = JSON.parse(clean)

    return NextResponse.json({ content })
  } catch (e) {
    console.error('Claude API error:', e)
    const message = e instanceof Error ? e.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
