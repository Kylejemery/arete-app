import Link from 'next/link'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import ProgressorSCurve from './ProgressorSCurve'
import base from './LongFilterFormalism.module.css'
import styles from './LongFilterWalkthrough.module.css'

/**
 * The Math of the Long Filter: a walkthrough. The text lives in
 * content/playground/long-filter-walkthrough.md and is rendered as written:
 * ```latex fences become KaTeX display math (at build time, so no script ships
 * for it), tables scroll sideways inside their own box on a narrow screen, and
 * the chart marker is replaced with the S curve. Set on the formal statement's
 * plate so the two companion notes read as a pair.
 */

const CHART_MARKER = '<!-- CHART: progressor-s-curve -->'

type HastNode = {
  type: string
  tagName?: string
  value?: string
  properties?: { className?: unknown }
  children?: HastNode[]
}

function latexSource(pre: HastNode | undefined): string | null {
  const code = pre?.children?.find((c) => c.type === 'element' && c.tagName === 'code')
  const cls = code?.properties?.className
  if (!Array.isArray(cls) || !cls.includes('language-latex')) return null
  return (code?.children ?? []).map((c) => c.value ?? '').join('').trim()
}

const components: Components = {
  pre({ node, children }) {
    const tex = latexSource(node as HastNode | undefined)
    if (tex === null) return <pre>{children}</pre>
    return (
      <div
        className={styles.math}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(tex, { displayMode: true, throwOnError: true }),
        }}
      />
    )
  },
  table({ children }) {
    return (
      <div className={base.tableScroll}>
        <table className={`${base.tbl} ${styles.tbl}`}>{children}</table>
      </div>
    )
  },
}

function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  )
}

export default function LongFilterWalkthrough({ source }: { source: string }) {
  // The first line is the title; it goes in the hero, the rest in the body.
  const [titleLine, ...rest] = source.split('\n')
  const title = titleLine.replace(/^#\s+/, '')
  const [beforeChart, afterChart = ''] = rest.join('\n').split(CHART_MARKER)

  return (
    <main className={base.page}>
      <div className={base.topBar}>
        <Link href="/playground/the-long-filter" className={base.backLink}>
          ← The Long Filter
        </Link>
      </div>

      <header className={`${base.wrap} ${base.hero}`}>
        <p className={base.eyebrow}>Arete / playground / walkthrough</p>
        <h1>{title}</h1>
      </header>

      <article className={`${base.wrap} ${styles.prose}`}>
        <Markdown source={beforeChart} />
        <ProgressorSCurve />
        <Markdown source={afterChart} />
      </article>

      <footer className={`${base.wrap} ${base.colophon}`}>
        <p className={`${base.footnote} ${base.colophonLink}`}>
          <Link href="/playground/the-long-filter/formalism">
            The derivations, the parameter sources, and the thirteen ways this could be wrong
          </Link>
        </p>
        <p className={`${base.footnote} ${base.mono} ${base.colophonLine}`}>
          Arete &nbsp;·&nbsp; working note &nbsp;·&nbsp; subject to revision
        </p>
      </footer>
    </main>
  )
}
