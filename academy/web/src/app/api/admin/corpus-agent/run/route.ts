import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Triggers the nightly Corpus Agent on demand. The agent is a separate Railway
// cron service (academy/corpus-ingestion, `node corpus-agent.js`, schedule
// "0 8 * * *"); this asks Railway to deploy it now, which runs the exact same
// code that runs nightly — it drains corpus_ingestion_queue and writes a row to
// corpus_ingestion_runs (which the Corpus Agent panel already displays).
//
// No ingestion work happens in this request, so there's no serverless timeout
// risk — we just fire the Railway mutation and return.

const RAILWAY_GQL = 'https://backboard.railway.com/graphql/v2'

// Stable infra identifiers for the corpus-ingestion service (not secrets).
// Overridable via env in case the project/service is recreated.
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID || '2a9389d7-2424-45b5-9416-65bb28122d9d'
const SERVICE_ID = process.env.RAILWAY_CORPUS_SERVICE_ID || '61526a1e-2bf2-484a-b287-d000cd523ecd'
const ENVIRONMENT_ID = process.env.RAILWAY_ENVIRONMENT_ID || '8aeea6b1-4c41-4603-94ba-8291db5b65df'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.RAILWAY_API_TOKEN
  if (!token) {
    return NextResponse.json(
      {
        error:
          'RAILWAY_API_TOKEN is not set. Add a Railway account/team API token as ' +
          'RAILWAY_API_TOKEN in the academy Vercel project env vars, then redeploy.',
      },
      { status: 503 }
    )
  }

  const query = `
    mutation RunCorpusAgent($input: EnvironmentTriggersDeployInput!) {
      environmentTriggersDeploy(input: $input)
    }`
  const variables = {
    input: { environmentId: ENVIRONMENT_ID, projectId: PROJECT_ID, serviceId: SERVICE_ID },
  }

  try {
    const res = await fetch(RAILWAY_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || (json.errors && json.errors.length)) {
      const msg = json.errors?.map((e: { message: string }) => e.message).join('; ')
        || `Railway API returned ${res.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to reach Railway' },
      { status: 502 }
    )
  }
}
