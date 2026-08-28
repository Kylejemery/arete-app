'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './admin.module.css'

type Overview = {
  week: string
  corpus: {
    lastRunAt: string | null
    status: string | null
    chunksAdded: number
    sourcesSucceeded: number
    sourcesFailed: number
    queuePending: number
  } | null
  journal: { analyzed: number; delivered: number; distressPending: number } | null
  gap: {
    reportWeek: string | null
    structuralGaps: number
    demandGaps: number
    pendingApprovals: number
    status: string | null
  } | null
  synthesis: {
    pendingReview: number
    totalIngested: number
    latestTitle: string | null
    latestStatus: string | null
  } | null
  scheduler: {
    scheduled: number
    lastPublished: string | null
    platforms: { x: boolean; bluesky: boolean; linkedin: boolean }
  } | null
  dispatch: {
    todayTitle: string | null
    delivered: number
    recipients: number
    generatedToday: boolean
  } | null
  reflection: {
    week: string | null
    title: string | null
    generatedAt: string | null
    anomalies: number
    criticalAnomalies: number
    agentsFired: number
    agentsTotal: number
  } | null
  tension: {
    pending: number
    approved: number
    inObservatory: number
    latestTitle: string | null
    lastGeneratedAt: string | null
  } | null
  inquiry: {
    pending: number
    approved: number
    latestQuestion: string | null
    lastGeneratedAt: string | null
  } | null
  dreams: {
    pending: number
    starred: number
    total: number
    lastGeneratedAt: string | null
  } | null
  consolidation: {
    pending: number
    approved: number
    edges: number
    lastReportDate: string | null
    lastReportExcerpt: string | null
  } | null
  longitudinal: { usersModeled: number; lastRunAt: string | null } | null
  world: {
    pending: number
    latestWeek: string | null
    latestStatus: string | null
    latestSignal: string | null
    lastGeneratedAt: string | null
  } | null
  stoicReplies: {
    pending: number
    promoted: number
    approvedToday: number
    lastFetchedAt: string | null
  } | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  if (h < 1) return `${Math.max(1, Math.floor(diff / 6e4))}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

type Metric = { label: string; value: React.ReactNode }

function AgentCard({
  icon, name, status, statusKind, metrics, footer, href, action,
}: {
  icon: string
  name: string
  status: string
  statusKind: 'ok' | 'warn' | 'error' | 'idle'
  metrics: Metric[]
  footer: string
  href: string
  action?: { label: string; onClick: () => void; disabled?: boolean }
}) {
  return (
    <div className={styles.agentCard}>
      <div className={styles.agentCardHeader}>
        <span className={styles.agentIcon}>{icon}</span>
        <span className={styles.agentName}>{name}</span>
        <span className={`${styles.agentStatus} ${styles['dot_' + statusKind]}`} />
        <span className={styles.agentStatusLabel}>{status}</span>
      </div>
      <div className={styles.agentMetrics}>
        {metrics.map(m => (
          <div key={m.label} className={styles.metric}>
            <span className={styles.metricValue}>{m.value}</span>
            <span className={styles.metricLabel}>{m.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.agentFooter}>
        <span className={styles.muted}>{footer}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {action && (
            <button
              className={styles.ghostBtn}
              style={{ height: 26, padding: '0 10px', fontSize: 11 }}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          )}
          <Link href={href} className={styles.viewLink}>View →</Link>
        </span>
      </div>
    </div>
  )
}

const PIPELINE: { when: string; icon: string; name: string; tag: string; text: string }[] = [
  {
    when: '03:00 daily', icon: '📚', name: 'RAG Corpus', tag: 'ingests',
    text: 'Pulls queued primary texts, chunks + embeds them into rag_corpus. The shared substrate every other agent retrieves from.',
  },
  {
    when: '03:30 Mon', icon: '🌍', name: 'World', tag: 'outward-facing',
    text: 'The only agent that looks outward. Weekly web search across philosophically relevant categories, picks the dominant signal, and has the corpus respond to it. Purely scientific signals auto-approve; anything political or contested waits for you. Approved weeks inject [WORLD CONTEXT] into the Dispatch and surface in the Observatory.',
  },
  {
    when: '04:00 daily', icon: '📓', name: 'Journal Analysis', tag: 'demand signal',
    text: 'Reads each user’s journal entries + Cabinet conversations and writes weekly themes and a personal insight to journal_analysis. Flags distress for human review — never auto-surfaced. This is what tells the rest of the fleet what the community is wrestling with.',
  },
  {
    when: '04:30 Mon', icon: '🧠', name: 'Longitudinal Model', tag: 'memory',
    text: 'Rebuilds a persistent philosophical portrait per user from all accumulated journal analysis — persistent/emerging/fading themes, growth edges, a prose portrait. Injected into each user’s Cabinet counselors so they remember the person across sessions. Admin sees aggregates only, never individual portraits.',
  },
  {
    when: '05:00 Mon', icon: '🧭', name: 'Coverage Gap', tag: 'Mondays',
    text: 'Compares community demand (Journal themes) against what the corpus actually covers, then recommends authors/works to add. Approved recommendations become the Corpus agent’s ingestion queue.',
  },
  {
    when: '05:30 Mon', icon: '⚖️', name: 'Tension', tag: 'holds contradictions',
    text: 'Hunts unresolved philosophical contradictions — places where two thinkers, read together, produce a problem neither resolves. Classifies honestly (genuine vs. terminological), steelmans both sides, and never resolves a genuine tension. Runs just before Synthesis so fresh tensions inform that morning’s work.',
  },
  {
    when: '06:00 Mon', icon: '🧩', name: 'Synthesis', tag: 'Mondays',
    text: 'Generates cross-thinker documents on in-demand concepts (mapping tensions, never resolving them). Once you approve one, it’s ingested back into the corpus as new source material — the corpus thinking about itself.',
  },
  {
    when: '06:30 Mon', icon: '❓', name: 'Inquiry', tag: 'open questions',
    text: 'Generates the questions the corpus raises but does not answer, pursues each across the full body of texts, and states honestly where the corpus runs out. Approved tensions become premium seed material. Its suggested reading feeds the corpus queue.',
  },
  {
    when: '10:00 daily', icon: '☀️', name: 'Daily Dispatch', tag: 'hourly delivery',
    text: 'Blends the top community themes + the latest synthesis + the week’s world context into one ~175-word reflection with a concrete practice, then delivers it as a push notification at each user’s local 7 AM.',
  },
  {
    when: 'continuous', icon: '📣', name: 'Content Scheduler', tag: 'social',
    text: 'Queues and publishes social posts (X, Bluesky, LinkedIn). The fleet’s outward voice; runs off content you approve.',
  },
  {
    when: '07:00 Sun', icon: '🪞', name: 'Self-Reflection', tag: 'meta',
    text: 'The meta-agent. Once a week it reviews the whole fleet — corpus growth, whether each agent fired, engagement, dispatch delivery — detects anomalies, and writes one honest health report with specific recommended actions. Reads everything, changes nothing; its reader is you.',
  },
  {
    when: '23:30 Sun', icon: '🌙', name: 'Dreaming', tag: 'conjecture',
    text: 'The corpus dreams at night. Seeds on approved tensions, approved inquiries, or semantic strangeness and generates what the corpus implies but never stated — aphorisms, thought experiments, propositions, meditations. Everything it produces is conjecture behind the strictest gate in the system: never attributed, never ingested, never surfaced without your per-dream approval.',
  },
]

function FleetGuide() {
  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardTitle}>How the fleet works</div>
        <p className={styles.muted} style={{ marginBottom: 14, lineHeight: 1.6 }}>
          Twelve agents run on a nightly/weekly cadence (times in UTC). Each reads from shared
          Supabase tables and feeds the next: the daily agents grow the corpus and read the
          community, the Monday chain turns that into gaps, tensions, syntheses, and open
          questions, the Dispatch carries it to users each morning — and on Sunday the fleet
          reflects on itself, then dreams.
        </p>
        {PIPELINE.map(s => (
          <div key={s.name} className={styles.guideStep}>
            <div className={styles.guideWhen}>{s.when}</div>
            <div className={styles.guideBody}>
              <div className={styles.guideName}>
                <span>{s.icon} {s.name}</span>
                <span className={styles.guideTag}>{s.tag}</span>
              </div>
              <div className={styles.guideText}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>How they interact</div>
        <p className={styles.flowLine}>
          <strong>Corpus</strong> is the substrate everyone retrieves from;{' '}
          <strong>Journal Analysis</strong> is the demand signal — it tells Coverage Gap,
          Synthesis, Dispatch, the Longitudinal Model, and the Tension agent what members are
          actually wrestling with.
        </p>
        <p className={styles.flowLine}>
          <strong>Coverage Gap → Corpus:</strong> turns coverage holes into the ingestion queue,
          so the corpus grows toward what the community needs. <strong>Inquiry</strong> feeds the
          same queue from the other side — its suggested reading names what the corpus lacks.
        </p>
        <p className={styles.flowLine}>
          <strong>Tension → Synthesis → Inquiry → Dreaming:</strong> the Monday thinking chain.
          Tension surfaces contradictions just before Synthesis maps concepts; approved tensions
          seed Inquiry’s open questions; approved tensions and inquiries become the Dreaming
          agent’s richest material on Sunday night.
        </p>
        <p className={styles.flowLine}>
          <strong>Synthesis → Corpus:</strong> approved cross-thinker documents are ingested back
          as retrievable source material — the only agent output that ever enters the corpus.
          Dreams never do.
        </p>
        <p className={styles.flowLine}>
          <strong>Longitudinal Model → Cabinet:</strong> each user’s portrait is injected into
          their counselors’ prompts, so the Cabinet remembers the person across sessions.
        </p>
        <p className={styles.flowLine}>
          <strong>World → Dispatch:</strong> the approved week’s world context is woven into the
          daily reflection, so the Dispatch knows what this week actually feels like.
        </p>
        <p className={styles.flowLine}>
          <strong>The Observatory</strong> is the public window: approved-and-visible tensions,
          inquiries, world responses, and dreams surface there — nothing appears without your
          per-item approval.
        </p>
        <p className={styles.flowLine}>
          <strong>Self-Reflection</strong> sits above them all — each Sunday it reads every agent’s
          output and the engagement tables to report on the health and trajectory of the whole
          system. It feeds nothing back in; its reader is you.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>What the admin is responsible for</div>
        <p className={styles.muted} style={{ marginBottom: 14, lineHeight: 1.6 }}>
          The agents generate and recommend; nothing reaches the corpus or a user without a human
          in the loop. Your job is the judgment calls:
        </p>
        <ul className={styles.respList}>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Review &amp; approve Synthesis documents</strong> — nothing is auto-ingested into the corpus. (Synthesis tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Review Tensions</strong> — approve, reject, or merge duplicates into the living catalogue. Genuine tensions are never resolved, only held open. (Tensions tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Review Inquiries</strong> — approve open questions and queue their suggested reading for the corpus. (Inquiry tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Judge the Dreams</strong> — the strictest gate in the system. Approve, star the genuinely good, reject the hollow. Dreams are never attributed, never ingested, never surfaced without you. (Dreams tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Review World observations</strong> — purely scientific signals auto-approve; political or contested ones wait for your call before touching the Dispatch. (World tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Control Observatory visibility</strong> — approved tensions, inquiries, world responses, and dreams only reach the public sky when you toggle each one visible.</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Triage distress flags</strong> from Journal Analysis — these route to a review queue, never auto-shown to users. (Distress / Journal tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Approve Coverage Gap recommendations</strong> — you decide what actually gets queued for ingestion. (Gap tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Curate the corpus ingestion queue</strong> — add and manage source texts. (Corpus Ingestion tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Approve &amp; schedule social posts.</strong> (Scheduler tab)</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Spot-check the daily Dispatch</strong> and tune each agent’s config (enable/disable, parameters). Config changes apply on the next run — no redeploy.</span></li>
          <li className={styles.respItem}><span className={styles.respMark}>✓</span><span><strong>Keep the Railway services healthy</strong> — schedule each agent’s cron manually and rotate Claude/OpenAI keys as needed.</span></li>
        </ul>
      </div>
    </>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [consolRunning, setConsolRunning] = useState(false)
  const [consolMsg, setConsolMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load overview')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Run the Consolidation Agent from the dashboard: fires the Railway run
  // (202 immediately), then refreshes the overview so new pending-review
  // counts and the fresh morning report show up.
  const runConsolidation = useCallback(async () => {
    setConsolRunning(true)
    setConsolMsg('')
    try {
      const res = await fetch('/api/admin/consolidation/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start')
      setConsolMsg('Consolidating — Hebbian update, synthesis, decay, report. Refreshing shortly…')
      setTimeout(() => { load(); setConsolMsg('') }, 45000)
    } catch (e) {
      setConsolMsg(e instanceof Error ? e.message : 'Failed to start')
    }
    setConsolRunning(false)
  }, [load])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Agent fleet</h1>
        <p>Status across the Arete autonomous agents.</p>
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !data && <p className={styles.muted}>Loading fleet status…</p>}

      {data && (
        <div className={styles.agentGrid}>
          <AgentCard
            icon="📚"
            name="RAG Corpus"
            status={data.corpus?.status === 'running' ? 'running' : data.corpus?.status === 'failed' ? 'failed' : data.corpus ? 'idle' : 'no data'}
            statusKind={!data.corpus ? 'idle' : data.corpus.status === 'failed' ? 'error' : data.corpus.sourcesFailed > 0 || data.corpus.queuePending > 0 ? 'warn' : 'ok'}
            metrics={[
              { label: 'Chunks added', value: data.corpus?.chunksAdded ?? 0 },
              { label: 'Queue pending', value: data.corpus?.queuePending ?? 0 },
            ]}
            footer={`Last run ${timeAgo(data.corpus?.lastRunAt ?? null)} · next tonight 3:00 AM ET`}
            href="/admin/corpus-agent"
          />

          <AgentCard
            icon="📓"
            name="Journal Analysis"
            status={data.journal ? (data.journal.distressPending > 0 ? 'review needed' : 'idle') : 'no data'}
            statusKind={!data.journal ? 'idle' : data.journal.distressPending > 0 ? 'warn' : 'ok'}
            metrics={[
              { label: 'Analyzed (7d)', value: data.journal?.analyzed ?? 0 },
              { label: 'Delivered (7d)', value: data.journal?.delivered ?? 0 },
              {
                label: 'Distress',
                value: (data.journal?.distressPending ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.journal?.distressPending}</span>
                  : 0,
              },
            ]}
            footer="Next nightly 4:00 AM ET"
            href="/admin/journal-agent"
          />

          <AgentCard
            icon="🌍"
            name="World"
            status={!data.world ? 'no data' : data.world.pending > 0 ? 'review needed' : data.world.latestStatus ? data.world.latestStatus.replace('_', ' ') : 'no observation'}
            statusKind={!data.world ? 'idle' : data.world.pending > 0 ? 'warn' : data.world.latestStatus ? 'ok' : 'idle'}
            metrics={[
              {
                label: 'Pending review',
                value: (data.world?.pending ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.world?.pending}</span>
                  : 0,
              },
              { label: 'Latest week', value: data.world?.latestWeek ?? '—' },
            ]}
            footer={data.world?.latestSignal
              ? `Responding to: ${data.world.latestSignal.slice(0, 38)}${data.world.latestSignal.length > 38 ? '…' : ''} · next Mon 03:30 UTC`
              : 'No observation yet · next Mon 03:30 UTC'}
            href="/admin/world"
          />

          <AgentCard
            icon="🧠"
            name="Longitudinal Model"
            status={!data.longitudinal ? 'no data' : data.longitudinal.usersModeled > 0 ? 'modeling' : 'no models yet'}
            statusKind={!data.longitudinal ? 'idle' : data.longitudinal.usersModeled > 0 ? 'ok' : 'idle'}
            metrics={[
              { label: 'Users modeled', value: data.longitudinal?.usersModeled ?? 0 },
              { label: 'Last run', value: timeAgo(data.longitudinal?.lastRunAt ?? null) },
            ]}
            footer="Aggregate view only · next Mon 04:30 UTC"
            href="/admin/longitudinal"
          />

          <AgentCard
            icon="🧭"
            name="Coverage Gap"
            status={data.gap?.reportWeek ? (data.gap.status ?? 'idle') : 'no report'}
            statusKind={!data.gap?.reportWeek ? 'idle' : (data.gap.pendingApprovals > 0 ? 'warn' : 'ok')}
            metrics={[
              { label: 'Structural', value: data.gap?.structuralGaps ?? 0 },
              { label: 'Demand', value: data.gap?.demandGaps ?? 0 },
              { label: 'Pending', value: data.gap?.pendingApprovals ?? 0 },
            ]}
            footer={data.gap?.reportWeek ? `Report week of ${data.gap.reportWeek} · next Mon 5:00 AM ET` : 'Next Mon 5:00 AM ET'}
            href="/admin/gap-agent"
          />

          <AgentCard
            icon="⚖️"
            name="Tension"
            status={!data.tension ? 'no data' : data.tension.pending > 0 ? 'review needed' : 'idle'}
            statusKind={!data.tension ? 'idle' : data.tension.pending > 0 ? 'warn' : 'ok'}
            metrics={[
              {
                label: 'Pending review',
                value: (data.tension?.pending ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.tension?.pending}</span>
                  : 0,
              },
              { label: 'Catalogue', value: data.tension?.approved ?? 0 },
              { label: 'In Observatory', value: data.tension?.inObservatory ?? 0 },
            ]}
            footer={data.tension?.latestTitle
              ? `Latest: ${data.tension.latestTitle.slice(0, 38)}${data.tension.latestTitle.length > 38 ? '…' : ''} · next Mon 05:30 UTC`
              : 'No tensions yet · next Mon 05:30 UTC'}
            href="/admin/tensions"
          />

          <AgentCard
            icon="🧩"
            name="Synthesis"
            status={data.synthesis ? ((data.synthesis.pendingReview ?? 0) > 0 ? 'review needed' : 'idle') : 'no data'}
            statusKind={!data.synthesis ? 'idle' : (data.synthesis.pendingReview > 0 ? 'warn' : 'ok')}
            metrics={[
              {
                label: 'Pending review',
                value: (data.synthesis?.pendingReview ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.synthesis?.pendingReview}</span>
                  : 0,
              },
              { label: 'Ingested', value: data.synthesis?.totalIngested ?? 0 },
            ]}
            footer={data.synthesis?.latestTitle
              ? `Latest: ${data.synthesis.latestTitle.slice(0, 40)}${data.synthesis.latestTitle.length > 40 ? '…' : ''} · next Mon 6:00 AM ET`
              : 'Next Mon 6:00 AM ET'}
            href="/admin/synthesis"
          />

          <AgentCard
            icon="❓"
            name="Inquiry"
            status={!data.inquiry ? 'no data' : data.inquiry.pending > 0 ? 'review needed' : 'idle'}
            statusKind={!data.inquiry ? 'idle' : data.inquiry.pending > 0 ? 'warn' : 'ok'}
            metrics={[
              {
                label: 'Pending review',
                value: (data.inquiry?.pending ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.inquiry?.pending}</span>
                  : 0,
              },
              { label: 'Approved', value: data.inquiry?.approved ?? 0 },
            ]}
            footer={data.inquiry?.latestQuestion
              ? `Latest: ${data.inquiry.latestQuestion.slice(0, 38)}${data.inquiry.latestQuestion.length > 38 ? '…' : ''} · next Mon 06:30 UTC`
              : 'No inquiries yet · next Mon 06:30 UTC'}
            href="/admin/inquiry"
          />

          <AgentCard
            icon="🏛️"
            name="Stoic Replies"
            status={!data.stoicReplies ? 'no data' : data.stoicReplies.pending > 0 ? 'review needed' : 'idle'}
            statusKind={!data.stoicReplies ? 'idle' : data.stoicReplies.pending > 0 ? 'warn' : 'ok'}
            metrics={[
              {
                label: 'Pending review',
                value: (data.stoicReplies?.pending ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.stoicReplies?.pending}</span>
                  : 0,
              },
              { label: 'Awaiting draft', value: data.stoicReplies?.promoted ?? 0 },
              { label: 'Approved today', value: data.stoicReplies?.approvedToday ?? 0 },
            ]}
            footer={data.stoicReplies?.lastFetchedAt
              ? `Last scouted ${timeAgo(data.stoicReplies.lastFetchedAt)} · every 6h · posting is manual`
              : 'No candidates yet · every 6h · posting is manual'}
            href="/admin/stoic-replies"
          />

          <AgentCard
            icon="☀️"
            name="Daily Dispatch"
            status={data.dispatch ? (data.dispatch.generatedToday ? 'generated' : 'pending') : 'no data'}
            statusKind={!data.dispatch ? 'idle' : data.dispatch.generatedToday ? 'ok' : 'warn'}
            metrics={[
              { label: 'Delivered', value: data.dispatch?.delivered ?? 0 },
              { label: 'Recipients', value: data.dispatch?.recipients ?? 0 },
            ]}
            footer={data.dispatch?.todayTitle
              ? `Today: ${data.dispatch.todayTitle.slice(0, 40)}${data.dispatch.todayTitle.length > 40 ? '…' : ''} · next 5:00 AM ET`
              : 'Not yet generated · next 5:00 AM ET'}
            href="/admin/dispatch"
          />

          <AgentCard
            icon="🪞"
            name="Self-Reflection"
            status={!data.reflection ? 'no report' : data.reflection.criticalAnomalies > 0 ? 'action needed' : data.reflection.anomalies > 0 ? 'warnings' : 'healthy'}
            statusKind={!data.reflection ? 'idle' : data.reflection.criticalAnomalies > 0 ? 'error' : data.reflection.anomalies > 0 ? 'warn' : 'ok'}
            metrics={[
              {
                label: 'Anomalies',
                value: (data.reflection?.criticalAnomalies ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.reflection?.anomalies}</span>
                  : (data.reflection?.anomalies ?? 0),
              },
              { label: 'Agents fired', value: data.reflection ? `${data.reflection.agentsFired}/${data.reflection.agentsTotal}` : '—' },
            ]}
            footer={data.reflection?.title
              ? `Latest: ${data.reflection.title.slice(0, 40)}${data.reflection.title.length > 40 ? '…' : ''} · next Sun 7:00 AM UTC`
              : 'No report yet · next Sun 7:00 AM UTC'}
            href="/admin/reflection"
          />

          <AgentCard
            icon="🌙"
            name="Dreaming"
            status={!data.dreams ? 'no data' : data.dreams.pending > 0 ? 'review needed' : data.dreams.total > 0 ? 'idle' : 'no dreams yet'}
            statusKind={!data.dreams ? 'idle' : data.dreams.pending > 0 ? 'warn' : 'ok'}
            metrics={[
              {
                label: 'Pending review',
                value: (data.dreams?.pending ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.dreams?.pending}</span>
                  : 0,
              },
              { label: 'Starred', value: data.dreams?.starred ?? 0 },
              { label: 'Total dreamed', value: data.dreams?.total ?? 0 },
            ]}
            footer={`Last dreamed ${timeAgo(data.dreams?.lastGeneratedAt ?? null)} · next Sun 23:30 UTC`}
            href="/admin/dreams"
          />

          <AgentCard
            icon="🕸️"
            name="Consolidation"
            status={!data.consolidation ? 'no data' : data.consolidation.pending > 0 ? 'review needed' : data.consolidation.edges > 0 ? 'learning' : 'graph empty'}
            statusKind={!data.consolidation ? 'idle' : data.consolidation.pending > 0 ? 'warn' : 'ok'}
            metrics={[
              {
                label: 'Pending review',
                value: (data.consolidation?.pending ?? 0) > 0
                  ? <span className={styles.redBadge}>{data.consolidation?.pending}</span>
                  : 0,
              },
              { label: 'In corpus', value: data.consolidation?.approved ?? 0 },
              { label: 'Graph edges', value: data.consolidation?.edges ?? 0 },
            ]}
            footer={consolMsg || (data.consolidation?.lastReportExcerpt
              ? `${data.consolidation.lastReportExcerpt.slice(0, 44)}… · nightly 07:30 UTC`
              : 'No report yet · nightly 07:30 UTC')}
            href="/admin/consolidation"
            action={{ label: consolRunning ? 'Starting…' : 'Run', onClick: runConsolidation, disabled: consolRunning }}
          />

          <AgentCard
            icon="📣"
            name="Content Scheduler"
            status={data.scheduler ? 'idle' : 'no data'}
            statusKind={data.scheduler ? 'ok' : 'idle'}
            metrics={[
              { label: 'Scheduled', value: data.scheduler?.scheduled ?? 0 },
              { label: 'Last post', value: timeAgo(data.scheduler?.lastPublished ?? null) },
            ]}
            footer={`X ${data.scheduler?.platforms.x ? '✓' : '—'} · Bluesky ${data.scheduler?.platforms.bluesky ? '✓' : '—'} · LinkedIn ${data.scheduler?.platforms.linkedin ? '✓' : 'pending'}`}
            href="/admin/scheduler"
          />
        </div>
      )}

      {data && (
        <div className={styles.actions}>
          <button className={styles.ghostBtn} onClick={load}>↺ Refresh</button>
        </div>
      )}

      <FleetGuide />
    </div>
  )
}
