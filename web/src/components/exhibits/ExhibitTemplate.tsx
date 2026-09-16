'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ag, GoldRule, Kicker } from '@/components/agora';
import { renderNative } from '@/exhibits/registry';
import { BRANCH_LABEL, type Exhibit } from '@/lib/exhibits';

/**
 * The exhibit frame. Every exhibit in the Garden is drawn by this
 * component, in this order: title and branch, the one-line summary, the
 * piece itself, the source it comes from, the thinkers it belongs to, and
 * the two ways out (the Academy and the Agora).
 *
 * Nothing here comes from anywhere but the exhibit's own row. The row is
 * checked by assertNoUserContent() before it arrives, and the one place
 * user-derived content is allowed is the `discussion` slot, which renders
 * below the frame and is visibly outside it. See the privacy note in
 * lib/exhibits.ts.
 *
 * Mirrors the mobile app at components/exhibits/ExhibitTemplate.tsx.
 */
export default function ExhibitTemplate({
  exhibit,
  discussion,
}: {
  exhibit: Exhibit;
  discussion?: ReactNode;
}) {
  const router = useRouter();

  return (
    <div style={{ padding: '48px 24px 64px', maxWidth: 880, margin: '0 auto' }}>
      {/* 1 and 2: title, branch, and the idea in one line. */}
      <Kicker>{BRANCH_LABEL[exhibit.branch]}</Kicker>
      <h1
        style={{
          fontFamily: ag.serif, fontSize: 44, fontWeight: 400, color: ag.text,
          lineHeight: 1.15, margin: '10px 0 0',
        }}
      >
        {exhibit.title}
      </h1>
      <GoldRule />
      <p style={{ fontFamily: ag.ui, fontSize: 17, lineHeight: 1.6, color: ag.body, margin: '0 0 36px' }}>
        {exhibit.summary}
      </p>

      {/* 3: the piece. */}
      <ExhibitBody exhibit={exhibit} />

      {/* 4: where it comes from. */}
      {exhibit.source_passage || exhibit.source_citation ? (
        <blockquote
          style={{
            borderLeft: `3px solid ${ag.gold}`, paddingLeft: 18, margin: '38px 0 0',
          }}
        >
          {exhibit.source_passage ? (
            <p style={{ fontFamily: ag.serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.62, color: ag.quote, margin: 0 }}>
              {exhibit.source_passage}
            </p>
          ) : null}
          {exhibit.source_citation ? (
            <p style={{ fontFamily: ag.ui, fontSize: 13, fontWeight: 600, color: ag.gold, margin: '10px 0 0' }}>
              {exhibit.source_citation}
            </p>
          ) : null}
        </blockquote>
      ) : null}

      {/* 5: the thinkers. Links, for the thinker pages to come. */}
      {exhibit.thinkers.length ? (
        <section style={{ marginTop: 38 }}>
          <Kicker>Thinkers</Kicker>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {exhibit.thinkers.map(t => (
              <button
                key={t}
                onClick={() => router.push(`/garden?thinker=${encodeURIComponent(t)}`)}
                style={{
                  fontFamily: ag.ui, fontSize: 13, color: ag.body, background: ag.card,
                  border: `1px solid ${ag.gold27}`, borderRadius: 2, padding: '7px 13px',
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* 6 and 7: the ways out. */}
      {exhibit.academy_path ? (
        <section style={{ marginTop: 38 }}>
          <Kicker>Go deeper</Kicker>
          <p style={{ fontFamily: ag.ui, fontSize: 14, fontStyle: 'italic', color: ag.muted, margin: '10px 0 0' }}>
            A session in the Academy takes this further. The Academy is forthcoming.
          </p>
        </section>
      ) : null}

      {exhibit.agora_prompt ? (
        <button
          onClick={() => router.push(`/agora/submit?prompt=${encodeURIComponent(exhibit.agora_prompt!)}`)}
          style={{
            marginTop: 38, width: '100%', fontFamily: ag.ui, fontSize: 14, fontWeight: 600,
            color: ag.gold, background: 'rgba(201,168,76,0.05)', border: `1px solid ${ag.gold53}`,
            borderRadius: 2, padding: '14px 18px', cursor: 'pointer',
          }}
        >
          Write about this
        </button>
      ) : null}

      {/* Outside the frame: the one place anything user-written may appear
          on an exhibit page. Never part of the row above. */}
      {discussion ? (
        <div style={{ marginTop: 56, borderTop: `1px solid ${ag.border}`, paddingTop: 32 }}>
          {discussion}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The piece itself, by kind. A native exhibit is looked up in the registry;
 * a web_embed loads in a sandboxed iframe; an external one is a link out,
 * leaving this page showing the frame.
 */
function ExhibitBody({ exhibit }: { exhibit: Exhibit }) {
  if (exhibit.kind === 'native') {
    const piece = renderNative(exhibit.component_key, { slug: exhibit.slug });
    if (!piece) {
      return <Missing>This exhibit is drawn in the app, and this build does not carry it.</Missing>;
    }
    return piece;
  }

  if (!exhibit.embed_url) return <Missing>This exhibit has no address to load.</Missing>;

  if (exhibit.kind === 'external') {
    return (
      <a
        href={exhibit.embed_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', textAlign: 'center', fontFamily: ag.ui, fontSize: 14, fontWeight: 600,
          color: ag.gold, background: 'rgba(201,168,76,0.05)', border: `1px solid ${ag.gold53}`,
          borderRadius: 2, padding: '16px 18px', textDecoration: 'none',
        }}
      >
        Open the exhibit
      </a>
    );
  }

  return (
    <iframe
      src={exhibit.embed_url}
      title={exhibit.title}
      // The exhibit is a document, not a peer: it may run its own scripts
      // but gets none of this origin's storage, and cannot navigate the
      // page that frames it.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      style={{
        display: 'block', width: '100%', height: 640, border: `1px solid ${ag.border}`,
        borderRadius: 2, background: ag.card,
      }}
    />
  );
}

function Missing({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontFamily: ag.ui, fontSize: 14, fontStyle: 'italic', color: ag.muted,
        background: ag.card, border: `1px solid ${ag.border}`, borderRadius: 2,
        padding: 18, margin: 0,
      }}
    >
      {children}
    </p>
  );
}
