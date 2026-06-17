'use client'

import { useState } from 'react'
import styles from './admin.module.css'

const PLATFORMS = {
  x:         { label: 'X / Twitter',  limit: 280,   badge: '280 chars' },
  linkedin:  { label: 'LinkedIn',     limit: 3000,  badge: 'Professional' },
  instagram: { label: 'Instagram',    limit: 2200,  badge: 'Caption + tags' },
  threads:   { label: 'Threads',      limit: 500,   badge: '500 chars' },
  bluesky:   { label: 'Bluesky',      limit: 300,   badge: '300 chars' },
  facebook:  { label: 'Facebook',     limit: 63206, badge: 'Page post' },
} as const

type PlatformKey = keyof typeof PLATFORMS

const ALL_PLATFORMS = Object.keys(PLATFORMS) as PlatformKey[]

type Status = { msg: string; active: boolean } | null
type GeneratedContent = Partial<Record<PlatformKey, string>>

export default function ContentScheduler() {
  const [topic, setTopic] = useState('')
  const [sourceType, setSourceType] = useState('topic')
  const [activePlatforms, setActivePlatforms] = useState<Set<PlatformKey>>(
    new Set(['x', 'linkedin', 'instagram', 'threads'])
  )
  const [content, setContent] = useState<GeneratedContent>({})
  const [approved, setApproved] = useState<Set<PlatformKey>>(new Set())
  const [scheduleTime, setScheduleTime] = useState('Best time (Buffer decides)')
  const [status, setStatus] = useState<Status>(null)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function togglePlatform(p: PlatformKey) {
    setActivePlatforms(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p); else next.add(p)
      return next
    })
  }

  function toggleApprove(p: PlatformKey) {
    setApproved(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p); else next.add(p)
      return next
    })
  }

  function updateContent(p: PlatformKey, val: string) {
    setContent(prev => ({ ...prev, [p]: val }))
  }

  async function generate(single?: PlatformKey) {
    if (!topic.trim()) { showToast('Enter a topic first'); return }
    const platforms = single ? [single] : [...activePlatforms]
    if (!platforms.length) { showToast('Select at least one platform'); return }

    setGenerating(true)
    setStatus({ msg: `Generating for ${platforms.length} platform${platforms.length > 1 ? 's' : ''}...`, active: true })
    if (!single) { setContent({}); setApproved(new Set()) }

    try {
      const res = await fetch('/api/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, sourceType, platforms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setContent(prev => ({ ...prev, ...data.content }))
      if (single) {
        setApproved(prev => { const next = new Set(prev); next.delete(single); return next })
      }
      setStatus({ msg: 'Content ready — review and approve', active: false })
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Generation failed')
      setStatus(null)
    }
    setGenerating(false)
  }

  async function schedule() {
    const toSchedule = [...approved]
    if (!toSchedule.length) { showToast('Approve at least one post first'); return }

    setStatus({ msg: `Scheduling ${toSchedule.length} posts via Buffer...`, active: true })

    const posts = toSchedule.map(p => ({
      platform: p,
      text: content[p] || '',
    }))

    try {
      const res = await fetch('/api/schedule-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts, scheduleTime }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = Array.isArray(data.details) && data.details.length
          ? `: ${data.details.join('; ')}`
          : ''
        throw new Error(`${data.error || 'Scheduling failed'}${detail}`)
      }
      showToast(`✓ ${data.scheduled} post${data.scheduled !== 1 ? 's' : ''} scheduled`)
      setApproved(new Set())
      setStatus(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Scheduling failed')
      setStatus(null)
    }
  }

  const hasContent = Object.keys(content).length > 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Arete content scheduler</h1>
        <p>Generate, review, and schedule — across every platform.</p>
      </div>

      {/* Source input */}
      <div className={styles.card}>
        <div className={styles.sectionLabel}>Content source</div>
        <div className={styles.sourceRow}>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="Topic, idea, or paste your Substack URL..."
            className={styles.topicInput}
          />
          <select value={sourceType} onChange={e => setSourceType(e.target.value)}>
            <option value="topic">Topic / idea</option>
            <option value="substack">Substack post URL</option>
            <option value="quote">Stoic quote</option>
            <option value="insight">App insight</option>
          </select>
        </div>

        <div className={styles.sectionLabel}>Platforms</div>
        <div className={styles.chipRow}>
          {ALL_PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`${styles.chip} ${activePlatforms.has(p) ? styles.chipOn : ''}`}
            >
              {PLATFORMS[p].label}
            </button>
          ))}
        </div>

        <div className={styles.scheduleRow}>
          <label>Schedule for:</label>
          <select value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}>
            <option>Post now</option>
            <option>Today at 9am</option>
            <option>Today at 12pm</option>
            <option>Today at 6pm</option>
            <option>Tomorrow at 9am</option>
            <option>Tomorrow at 6pm</option>
            <option>Best time (Buffer decides)</option>
          </select>
        </div>

        <div className={styles.generateRow}>
          <button
            onClick={() => generate()}
            disabled={generating}
            className={styles.primaryBtn}
          >
            {generating ? 'Generating...' : '✦ Generate posts'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div className={styles.statusBar}>
          <span className={`${styles.dot} ${status.active ? styles.dotActive : styles.dotDone}`} />
          {status.msg}
        </div>
      )}

      {/* Platform cards */}
      {hasContent && (
        <div className={styles.grid}>
          {[...activePlatforms].map(p => {
            const text = content[p] || ''
            const info = PLATFORMS[p]
            const isApproved = approved.has(p)
            return (
              <div key={p} className={`${styles.platformCard} ${isApproved ? styles.platformApproved : ''}`}>
                <div className={styles.platformHeader}>
                  <span className={styles.platformName}>{info.label}</span>
                  <span className={styles.platformBadge}>{info.badge}</span>
                </div>
                <div className={styles.platformBody}>
                  <textarea
                    value={text}
                    onChange={e => updateContent(p, e.target.value)}
                    rows={5}
                  />
                </div>
                <div className={styles.platformFooter}>
                  <span className={`${styles.charCount} ${text.length > info.limit ? styles.charOver : ''}`}>
                    {text.length} / {info.limit}
                  </span>
                  <div className={styles.footerActions}>
                    <button
                      onClick={() => generate(p)}
                      className={styles.iconBtn}
                      title="Regenerate"
                    >↺</button>
                    <button
                      onClick={() => toggleApprove(p)}
                      className={`${styles.iconBtn} ${isApproved ? styles.iconApproved : ''}`}
                      title={isApproved ? 'Unapprove' : 'Approve'}
                    >{isApproved ? '✓' : '○'}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom actions */}
      {hasContent && (
        <div className={styles.actions}>
          <button onClick={() => generate()} className={styles.ghostBtn}>↺ Regenerate all</button>
          <button onClick={schedule} className={styles.scheduleBtn}>
            Schedule approved ({approved.size}) →
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
