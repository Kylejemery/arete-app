'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import styles from './HappinessScale.module.css'

// ── Data ────────────────────────────────────────────────────────────────────

const ZONES = [
  {
    id: 'ataraxia',
    greek: 'ἈΤΑΡΑΞΊΑ',
    label: 'Ataraxia',
    sub: 'The Terminus',
    color: '#c9a84c',
    borderColor: '#c9a84c',
    bg: '#0c1a0e',
    position: 0,
    howItFeels: 'Nothing disturbs you at the root. Events happen; you respond, not react. No residue.',
    markers: [
      'Sleep is deep and undisturbed',
      'No craving between meals',
      "Criticism doesn't sting",
      'Comfort and discomfort feel equal',
      "No envy of others' lives",
      'Death contemplated calmly',
    ],
    driftWarning: 'Spiritual pride — believing you\'ve arrived is itself a disturbance. The sage has no contempt.',
    strategies: [
      'Maintain the practice even after progress',
      'Teach others — the Socratic obligation',
      'Return to voluntary hardship periodically',
      'Journal daily to stay honest',
    ],
    quote: '"He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has."',
    quoteBy: 'Epictetus',
    greekTerm: 'σοφός · the sage',
  },
  {
    id: 'askesis',
    greek: 'ἌΣΚΗΣΙΣ',
    label: 'Voluntary Askēsis',
    sub: 'The Path',
    color: '#a89060',
    borderColor: '#8a7a3a',
    bg: '#0f1a0f',
    position: 25,
    howItFeels: 'Chosen difficulty. Hard in the moment, clean afterward. You elected this — that matters.',
    markers: [
      "Training when you don't feel like it",
      'Fasting with equanimity',
      'Cold exposure without complaint',
      'Choosing discomfort over convenience deliberately',
      'Practice feels meaningful, not merely painful',
    ],
    driftWarning: 'Performing askēsis for identity or status — Seneca\'s trap. The practice must be inward.',
    strategies: [
      'Entry: skip one meal weekly, cold shower finish',
      'Intermediate: 24hr fast, hard training fasted',
      'Advanced: 36hr fast + training, poverty practice',
      'Build a weekly rhythm — hardship is a training cycle',
    ],
    quote: '"Set aside a number of days in which you shall be content with the scantiest and cheapest fare."',
    quoteBy: 'Seneca, Letters XVIII',
    greekTerm: 'πόνος · toil with purpose',
  },
  {
    id: 'neutral',
    greek: 'ΜΈΣΟΝ',
    label: 'Neutral State',
    sub: 'The Untested Middle',
    color: '#7a9ab0',
    borderColor: '#3a5a6e',
    bg: '#0e1620',
    position: 50,
    howItFeels: 'Fine. Not bad, not great. Comfortable enough to stay, not sharp enough to push leftward.',
    markers: [
      'No strong cravings but also no real discipline',
      'Skipping practice when inconvenient',
      '"I could stop anytime" — but never testing it',
      'Days feel full but not directed',
    ],
    driftWarning: 'This zone is deceptive. Comfort gravity always pulls right. Without practice, drift is certain.',
    strategies: [
      'Name what you actually depend on',
      'Do one hard thing daily',
      'Subtraction audit: remove one comfort for 30 days',
      'Ask: what would I lose if this were taken away?',
    ],
    quote: '"Comfort is the enemy of achievement and the parent of weakness."',
    quoteBy: 'Seneca',
    greekTerm: 'ἀδιάφορα · indifferents',
  },
  {
    id: 'hedonic',
    greek: 'ἩΔΟΝΉ',
    label: 'Hedonic Drift',
    sub: 'Accumulating Want',
    color: '#c08060',
    borderColor: '#6a3a2a',
    bg: '#1a1010',
    position: 75,
    howItFeels: 'Restless satisfaction. Each want met births a new one. The horizon always moves.',
    markers: [
      'Scrolling without intent',
      'Eating past hunger',
      'Upgrading what works fine',
      "Comparing your life to others' curated highlights",
      'Boredom with the ordinary',
    ],
    driftWarning: 'Mimetic desire — wanting what others have, not what you actually need. Girard\'s trap.',
    strategies: [
      '48hr no-screen fast',
      'Name your mimetic model: whose life are you wanting?',
      'Remove one comfort per week for a month',
      'Return to basics: sleep, water, movement, silence',
    ],
    quote: '"Men are disturbed not by the things which happen, but by the opinions about things."',
    quoteBy: 'Epictetus, Enchiridion',
    greekTerm: 'πλεονεξία · always more',
  },
  {
    id: 'epithumia',
    greek: 'ἘΠΙΘΥΜΊΑ',
    label: 'Epithumia',
    sub: 'Soul in Chains',
    color: '#c05050',
    borderColor: '#8b2020',
    bg: '#1a0808',
    position: 100,
    howItFeels: 'Chronic low-grade anxiety. Nothing is ever enough. Anger when denied. Identity tied to having.',
    markers: [
      'Irritable when routines are disrupted',
      "Can't sit in silence",
      'Suffering when deprived of small comforts',
      'Resentment toward others who have more',
      'This state normalizes — you stop noticing the chains',
    ],
    driftWarning: 'This state normalizes. You stop noticing the chains because everyone around you wears them.',
    strategies: [
      'Name the chains first — write every dependency',
      'One day without your biggest comfort',
      'Sit in silence 10 minutes daily — no phone',
      'Ask: who would I be without this?',
    ],
    quote: '"Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are."',
    quoteBy: 'Epictetus, Enchiridion',
    greekTerm: 'δουλεία · slavery to want',
  },
]

const PHILOSOPHERS = [
  { name: 'Diogenes', position: 5, color: '#c9a84c', desc: 'Lived in a barrel. Radical external subtraction as life.' },
  { name: 'Epictetus', position: 18, color: '#a89060', desc: 'Slave who owned nothing, needed nothing. Inner freedom.' },
  { name: 'Marcus', position: 32, color: '#a89060', desc: 'Emperor with unlimited access — declined it. Power without need.' },
  { name: 'Seneca', position: 55, color: '#9a6a5a', desc: 'Preached detachment, lived in great wealth. Knew the gap.' },
  { name: 'Epicurus', position: 70, color: '#7a6a8a', desc: 'Simple garden life. Goal still pleasure, even if refined.' },
  { name: 'Modern Consumer', position: 92, color: '#8b2020', desc: 'Optimizing comfort. Every itch scratched. Soul restless, enslaved.' },
]

const DIAGNOSTICS = [
  { label: 'The Silence Test', question: 'Can you sit alone in silence for 20 minutes with no input?', no: 'Epithumia zone. Discomfort with silence = dependency on stimulation.', yes: 'Neutral or left of it.' },
  { label: 'The Removal Test', question: 'Remove your biggest comfort for one week. What happens?', no: 'Agitation, irritability → Hedonic drift or deeper. It owns you.', yes: 'Equanimity → Left zone. Strong signal.' },
  { label: 'The Envy Test', question: "Whose life do you want when scrolling social media?", no: "Strong envy → Mimetic drift. You are borrowing others' desires.", yes: "No one's → Progressing well leftward." },
  { label: 'The Disruption Test', question: 'When your routine breaks, how long until equilibrium?', no: 'Days of irritability → Epithumia. Hours → Hedonic drift.', yes: 'Minutes or none → Strong left signal.' },
  { label: 'The Death Test', question: 'Contemplate your death right now. What arises?', no: 'Terror, avoidance → Deep attachment to outcomes and things.', yes: 'Calm curiosity → Near the left.' },
  { label: 'The Praise Test', question: 'When criticized publicly, what do you feel?', no: 'Shame, anger, need to defend → Reputation dependency.', yes: 'Genuine indifference → Left signal.' },
]

const OBSTACLES = [
  {
    thinker: 'Borgmann',
    title: 'The Device Paradigm',
    sub: 'Technology & the Character of Contemporary Life',
    color: '#a888cc',
    border: '#6a4a8a',
    bg: '#130e1a',
    body: 'The device conceals its own machinery and delivers a commodity — warmth, entertainment, food — without engagement. A furnace replaces the hearth. A phone replaces presence. Each device silently removes a practice that built character.',
    pull: 'Comfort delivered without effort erodes the capacity for voluntary hardship.',
    resistance: 'Focal practices — cooking, running, craftsmanship. ἔργα.',
  },
  {
    thinker: 'Girard',
    title: 'Mimetic Desire',
    sub: 'We want what others want',
    color: '#cc8888',
    border: '#8a3a3a',
    bg: '#1a0e0e',
    body: "Desire is not spontaneous — it is borrowed from a model. You don't want the object, you want their life. Social media is a mimetic desire accelerant. Infinite models, infinite objects to borrow desire from.",
    pull: 'You accumulate not from need but from triangulated envy. The wanting never ends.',
    resistance: 'Name your mimetic model. Whose life are you actually wanting?',
  },
  {
    thinker: 'Debord',
    title: 'The Spectacle',
    sub: 'Life reduced to representation',
    color: '#6aa0cc',
    border: '#3a6a8a',
    bg: '#0e1218',
    body: 'Modern life is increasingly lived as spectacle — image, representation, performance rather than direct living. You document instead of experience. You perform identity instead of living it.',
    pull: 'Identity becomes a consumption object. You need to be seen having the life.',
    resistance: 'Do things that cannot be photographed. Sit in silence.',
  },
]

// ── Sub-components ───────────────────────────────────────────────────────────

function ScaleBar({ activeZone, onZoneClick }: { activeZone: number; onZoneClick: (i: number) => void }) {
  return (
    <div className={styles.scaleWrap}>
      <div className={styles.scaleBar}>
        {ZONES.map((z, i) => (
          <button
            key={z.id}
            className={`${styles.scaleSegment} ${activeZone === i ? styles.scaleSegmentActive : ''}`}
            style={{ '--zone-color': z.color } as React.CSSProperties}
            onClick={() => onZoneClick(i)}
            aria-label={z.label}
          >
            <span className={styles.scaleGreek}>{z.greek}</span>
          </button>
        ))}
      </div>
      <div className={styles.scaleLabels}>
        {ZONES.map((z, i) => (
          <button
            key={z.id}
            className={`${styles.scaleLabel} ${activeZone === i ? styles.scaleLabelActive : ''}`}
            style={{ '--zone-color': z.color } as React.CSSProperties}
            onClick={() => onZoneClick(i)}
          >
            {z.label}
          </button>
        ))}
      </div>
      <div className={styles.scaleDirections}>
        <span style={{ color: '#c9a84c' }}>← Εὐδαιμονία increases</span>
        <span style={{ color: '#8b2020' }}>Suffering increases →</span>
      </div>
    </div>
  )
}

function ZoneCard({ zone, isActive }: { zone: typeof ZONES[0]; isActive: boolean }) {
  return (
    <div
      className={`${styles.zoneCard} ${isActive ? styles.zoneCardActive : ''}`}
      style={{
        '--zone-color': zone.color,
        '--zone-border': zone.borderColor,
        '--zone-bg': zone.bg,
      } as React.CSSProperties}
    >
      <div className={styles.zoneHeader}>
        <div>
          <div className={styles.zoneGreek}>{zone.greek}</div>
          <div className={styles.zoneLabel}>{zone.label}</div>
          <div className={styles.zoneSub}>{zone.sub}</div>
        </div>
        <div className={styles.zoneGreekTerm}>{zone.greekTerm}</div>
      </div>

      <div className={styles.zoneBody}>
        <div className={styles.zoneSection}>
          <div className={styles.zoneSectionLabel}>HOW IT FEELS</div>
          <p className={styles.zoneSectionText}>{zone.howItFeels}</p>
        </div>

        <div className={styles.zoneSection}>
          <div className={styles.zoneSectionLabel}>BEHAVIORAL MARKERS</div>
          <ul className={styles.zoneList}>
            {zone.markers.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>

        <div className={styles.zoneSection}>
          <div className={styles.zoneSectionLabel}>DRIFT WARNING</div>
          <p className={styles.zoneDrift}>{zone.driftWarning}</p>
        </div>

        <div className={styles.zoneSection}>
          <div className={styles.zoneSectionLabel}>STRATEGIES</div>
          <ul className={styles.zoneList}>
            {zone.strategies.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>

        <blockquote className={styles.zoneQuote}>
          <p>{zone.quote}</p>
          <cite>— {zone.quoteBy}</cite>
        </blockquote>
      </div>
    </div>
  )
}

function PhilosopherMap() {
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div className={styles.philWrap}>
      <div className={styles.philBar}>
        <div className={styles.philLine} />
        {PHILOSOPHERS.map((p, i) => (
          <div
            key={p.name}
            className={styles.philMarker}
            style={{ left: `${p.position}%`, '--phil-color': p.color } as React.CSSProperties}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className={styles.philDot} />
            <div className={styles.philTick} />
            <div className={`${styles.philTooltip} ${hovered === i ? styles.philTooltipVisible : ''}`}>
              <strong>{p.name}</strong>
              <span>{p.desc}</span>
            </div>
            <div className={`${styles.philName} ${i % 2 === 0 ? styles.philNameAbove : styles.philNameBelow}`}>
              {p.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiagnosticCard({ d, index }: { d: typeof DIAGNOSTICS[0]; index: number }) {
  const [revealed, setRevealed] = useState<'yes' | 'no' | null>(null)
  return (
    <div className={styles.diagCard}>
      <div className={styles.diagNumber}>0{index + 1}</div>
      <div className={styles.diagLabel}>{d.label}</div>
      <p className={styles.diagQuestion}>{d.question}</p>
      <div className={styles.diagButtons}>
        <button
          className={`${styles.diagBtn} ${styles.diagBtnNo} ${revealed === 'no' ? styles.diagBtnActive : ''}`}
          onClick={() => setRevealed(revealed === 'no' ? null : 'no')}
        >
          No / Struggle
        </button>
        <button
          className={`${styles.diagBtn} ${styles.diagBtnYes} ${revealed === 'yes' ? styles.diagBtnActive : ''}`}
          onClick={() => setRevealed(revealed === 'yes' ? null : 'yes')}
        >
          Yes / Easily
        </button>
      </div>
      {revealed && (
        <div className={`${styles.diagResult} ${revealed === 'yes' ? styles.diagResultYes : styles.diagResultNo}`}>
          {revealed === 'yes' ? d.yes : d.no}
        </div>
      )}
    </div>
  )
}

function ObstacleCard({ o }: { o: typeof OBSTACLES[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`${styles.obstCard} ${open ? styles.obstCardOpen : ''}`}
      style={{ '--obs-color': o.color, '--obs-border': o.border, '--obs-bg': o.bg } as React.CSSProperties}
    >
      <button className={styles.obstHeader} onClick={() => setOpen(!open)}>
        <div>
          <div className={styles.obstThinker}>{o.thinker}</div>
          <div className={styles.obstTitle}>{o.title}</div>
          <div className={styles.obstSub}>{o.sub}</div>
        </div>
        <span className={styles.obstChevron}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className={styles.obstBody}>
          <p>{o.body}</p>
          <div className={styles.obstPull}>
            <span className={styles.obstPullLabel}>→ Rightward pull:</span> {o.pull}
          </div>
          <div className={styles.obstResist}>
            <span className={styles.obstResistLabel}>Resistance:</span> {o.resistance}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * The Scale of Happiness (Κλίμακα Εὐδαιμονίας) — the interactive framework:
 * the Greek scale bar, five zones, the philosopher map, six diagnostics, and
 * the three obstacles. Rendered on its own at /framework and, with a back link
 * and the closing CTA suppressed, as a Playground experiment.
 */
export default function HappinessScale({
  backHref,
  backLabel = '← Back',
  showFooter = true,
}: {
  backHref?: string
  backLabel?: string
  showFooter?: boolean
}) {
  const [activeZone, setActiveZone] = useState(2)
  const zoneRefs = useRef<(HTMLDivElement | null)[]>([])
  const sectionRefs = {
    zones: useRef<HTMLDivElement>(null),
    philosophers: useRef<HTMLDivElement>(null),
    diagnostics: useRef<HTMLDivElement>(null),
    obstacles: useRef<HTMLDivElement>(null),
  }

  const handleZoneClick = (i: number) => {
    setActiveZone(i)
    zoneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className={styles.page}>

      {backHref && (
        <div className={styles.topBar}>
          <Link href={backHref} className={styles.backLink}>{backLabel}</Link>
        </div>
      )}

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroEyebrow}>ARETE · PHILOSOPHICAL FRAMEWORK</div>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroGreek}>Κλίμακα Εὐδαιμονίας</span>
          <span className={styles.heroEng}>The Scale of Happiness</span>
        </h1>
        <p className={styles.heroSub}>
          Freedom is not given — it is earned by subtracting what enslaves you.
          <br />
          Locate yourself. Move left. Practice daily.
        </p>
        <div className={styles.heroRule} />
        <ScaleBar activeZone={activeZone} onZoneClick={handleZoneClick} />
        <div className={styles.heroNav}>
          <button className={styles.heroNavBtn} onClick={() => scrollTo(sectionRefs.zones)}>I · The Zones</button>
          <button className={styles.heroNavBtn} onClick={() => scrollTo(sectionRefs.philosophers)}>II · The Philosophers</button>
          <button className={styles.heroNavBtn} onClick={() => scrollTo(sectionRefs.diagnostics)}>III · Diagnostic</button>
          <button className={styles.heroNavBtn} onClick={() => scrollTo(sectionRefs.obstacles)}>IV · Obstacles</button>
        </div>
      </section>

      {/* ── Zones ── */}
      <section className={styles.section} ref={sectionRefs.zones}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>I</span>
          <h2 className={styles.sectionTitle}>The Zones</h2>
          <p className={styles.sectionDesc}>Click any zone on the scale above to jump to it. Each zone has behavioral markers, drift warnings, and practical strategies.</p>
        </div>
        <div className={styles.zoneGrid}>
          {ZONES.map((z, i) => (
            <div key={z.id} ref={el => { zoneRefs.current[i] = el }}>
              <ZoneCard zone={z} isActive={activeZone === i} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Philosophers ── */}
      <section className={styles.section} ref={sectionRefs.philosophers}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>II</span>
          <h2 className={styles.sectionTitle}>The Philosophers</h2>
          <p className={styles.sectionDesc}>Hover each figure to see where they land and why. The same destination — different paths.</p>
        </div>
        <PhilosopherMap />
        <div className={styles.philCards}>
          {PHILOSOPHERS.map(p => (
            <div key={p.name} className={styles.philCard} style={{ '--phil-color': p.color } as React.CSSProperties}>
              <div className={styles.philCardName}>{p.name}</div>
              <p className={styles.philCardDesc}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Diagnostics ── */}
      <section className={styles.section} ref={sectionRefs.diagnostics}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>III</span>
          <h2 className={styles.sectionTitle}>Diagnostic</h2>
          <p className={styles.sectionDesc}>Six tests. Answer honestly. Direction matters more than position — a man moving left from 2 is further along than a man stuck at 4.</p>
        </div>
        <div className={styles.diagGrid}>
          {DIAGNOSTICS.map((d, i) => <DiagnosticCard key={i} d={d} index={i} />)}
        </div>
      </section>

      {/* ── Obstacles ── */}
      <section className={styles.section} ref={sectionRefs.obstacles}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>IV</span>
          <h2 className={styles.sectionTitle}>The Obstacles</h2>
          <p className={styles.sectionDesc}>Three thinkers from your corpus — what pulls you rightward, how it works, and how to resist.</p>
        </div>
        <div className={styles.obstGrid}>
          {OBSTACLES.map(o => <ObstacleCard key={o.thinker} o={o} />)}
        </div>
        <div className={styles.masterObstacle}>
          <h3 className={styles.masterTitle}>The Master Obstacle</h3>
          <p className={styles.masterSub}>The deepest pull rightward is not any single force — it is that everyone around you is there.</p>
          <div className={styles.masterGrid}>
            <div><strong>Borgmann says</strong><p>Devices restructure life so thoroughly that resistance feels eccentric, not heroic.</p></div>
            <div><strong>Girard says</strong><p>Your desire is shaped by those around you. In a culture of want, you will want.</p></div>
            <div><strong>Debord says</strong><p>The spectacle is total. Opting out requires you to refuse the frame entirely.</p></div>
            <div><strong>Stoic answer</strong><p>The obstacle is the way. Resistance to the current is the practice itself. <em>ἔργα οὐ λόγοι.</em></p></div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      {showFooter && (
        <footer className={styles.footer}>
          <div className={styles.footerRule} />
          <div className={styles.footerGreek}>ἔργα οὐ λόγοι</div>
          <div className={styles.footerEng}>Deeds · Not · Words</div>
          <a href="/academy" className={styles.footerCta}>Begin the Formation →</a>
        </footer>
      )}

    </main>
  )
}
