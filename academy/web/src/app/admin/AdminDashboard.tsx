'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import styles from './admin.module.css'
import ContentScheduler from './ContentScheduler'
import CorpusAgentPanel, { type Health } from './CorpusAgentPanel'

type AgentKey = 'content' | 'corpus'

const AGENTS: { key: AgentKey; label: string }[] = [
  { key: 'content', label: 'Content' },
  { key: 'corpus', label: 'RAG Corpus' },
]

export default function AdminDashboard() {
  const [active, setActive] = useState<AgentKey>('content')
  const [health, setHealth] = useState<Record<AgentKey, Health>>({
    content: 'ok',
    corpus: 'loading',
  })

  // Stable identity so CorpusAgentPanel's fetch effect doesn't re-run each render.
  const onCorpusHealth = useCallback((h: Health) => {
    setHealth(prev => ({ ...prev, corpus: h }))
  }, [])

  return (
    <div>
      <div className={styles.fleetBar}>
        <span className={styles.fleetTitle}>Arete Agents</span>
        <div className={styles.fleetTabs}>
          {AGENTS.map(a => (
            <button
              key={a.key}
              className={`${styles.fleetTab} ${active === a.key ? styles.fleetTabOn : ''}`}
              onClick={() => setActive(a.key)}
            >
              <span className={`${styles.agentDot} ${styles['dot_' + health[a.key]]}`} />
              {a.label}
            </button>
          ))}
        </div>
        <Link href="/admin/corpus" className={styles.fleetLink}>+ Ingest passage</Link>
      </div>

      {/* Keep the scheduler mounted so its in-progress state survives tab switches. */}
      <div style={{ display: active === 'content' ? 'block' : 'none' }}>
        <ContentScheduler />
      </div>
      <div style={{ display: active === 'corpus' ? 'block' : 'none' }}>
        <CorpusAgentPanel onHealth={onCorpusHealth} />
      </div>
    </div>
  )
}
