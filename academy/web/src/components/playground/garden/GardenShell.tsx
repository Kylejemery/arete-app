import Link from 'next/link'
import { parts, type PartId } from '@/content/playground/garden'
import CorpusDiscussion from '@/components/playground/CorpusDiscussion'
import styles from './Garden.module.css'

/**
 * The frame every page of the Garden sits in: the top bar, the hero, the
 * children, a "the other beds" footer and the corpus discussion board. The
 * bed pages pass their `part` so the accent colour follows the part of the
 * garden they belong to.
 */

const PART_CLASS: Record<PartId, string> = {
  logic: styles.partLogic,
  physics: styles.partPhysics,
  ethics: styles.partEthics,
}

export const PART_SWATCH: Record<PartId, string> = {
  logic: '#cfc6b0',
  physics: '#86a06c',
  ethics: '#b8473f',
}

export default function GardenShell({
  part,
  eyebrow,
  title,
  lede,
  children,
  threadKey,
  context,
  discussHeading,
  discussPlaceholder,
}: {
  part: PartId | null
  eyebrow: string
  title: string
  lede: string
  children: React.ReactNode
  threadKey: string
  context: string
  discussHeading: string
  discussPlaceholder: string
}) {
  const others = parts.filter((p) => p.id !== part)
  return (
    <main className={`${styles.page} ${part ? PART_CLASS[part] : ''}`}>
      <div className={styles.topBar}>
        <Link href="/playground" className={styles.backLink}>
          ← The Playground
        </Link>
        {part && (
          <Link href="/playground/the-garden" className={styles.backLink}>
            ← The Garden
          </Link>
        )}
      </div>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
      </header>

      {children}

      <section className={styles.section} aria-label="The other beds">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>{part ? 'The other beds' : 'The three beds'}</p>
        </div>
        <div className={styles.beds}>
          {others.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className={styles.bed}
              style={{ ['--swatch' as string]: PART_SWATCH[p.id] }}
            >
              <span className={styles.bedKicker}>{p.figure}</span>
              <span className={styles.bedName}>{p.name}</span>
              <span className={styles.bedLine}>{p.line}</span>
            </Link>
          ))}
          {part && (
            <Link href="/playground/the-garden" className={styles.bed}>
              <span className={styles.bedKicker}>The whole</span>
              <span className={styles.bedName}>The Garden</span>
              <span className={styles.bedLine}>Wall, soil and fruit together.</span>
            </Link>
          )}
        </div>
      </section>

      <section className={styles.discuss}>
        <CorpusDiscussion
          threadKey={threadKey}
          context={context}
          heading={discussHeading}
          placeholder={discussPlaceholder}
        />
      </section>
    </main>
  )
}
