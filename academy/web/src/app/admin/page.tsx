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
  icon, name, status, statusKind, metrics, footer, href,
}: {
  icon: string
  name: string
  status: string
  statusKind: 'ok' | 'warn' | 'error' | 'idle'
  metrics: Metric[]
  footer: string
  href: string
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
        <Link href={href} className={styles.viewLink}>View →</Link>
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
    </div>
  )
}
