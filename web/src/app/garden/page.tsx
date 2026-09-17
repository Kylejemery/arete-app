'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ag, EmptyNote, GoldRule, Kicker, TopicChip } from '@/components/agora';
import {
  BRANCHES, BRANCH_GLOSS, BRANCH_LABEL, FIELD_CITATION, FIELD_PASSAGE,
  GARDEN_SUBTITLE, GARDEN_TITLE,
  byBranch, listGalleryExhibits, thinkersOf, type Exhibit,
} from '@/lib/exhibits';

export default function GardenPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: ag.muted }}>Loading</div>}>
      <GardenIndex />
    </Suspense>
  );
}

/**
 * The Garden: every exhibit in the gallery, grouped by the branch of
 * philosophy it belongs to. The page is generated entirely from the
 * exhibits table. Nothing here knows the name of any exhibit.
 *
 * A thinker chip on an exhibit page links back here with ?thinker=, which
 * is why the filter reads the param.
 */
function GardenIndex() {
  const router = useRouter();
  const params = useSearchParams();
  const thinker = params.get('thinker');
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listGalleryExhibits();
        if (cancelled) return;
        setExhibits(list);
        setError(null);
      } catch {
        if (!cancelled) setError('The Garden could not be reached.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const thinkers = useMemo(() => thinkersOf(exhibits), [exhibits]);
  const shown = useMemo(
    () => (thinker ? exhibits.filter(e => e.thinkers.includes(thinker)) : exhibits),
    [exhibits, thinker],
  );

  const setThinker = (t: string | null) =>
    router.push(t ? `/garden?thinker=${encodeURIComponent(t)}` : '/garden');

  return (
    <div style={{ padding: '48px 24px 64px', maxWidth: 1040, margin: '0 auto' }}>
      <div style={{ maxWidth: 660, marginBottom: 40 }}>
        <Kicker>{GARDEN_TITLE}</Kicker>
        <h1 style={{ fontFamily: ag.serif, fontSize: 46, fontWeight: 400, color: ag.text, lineHeight: 1.14, margin: '10px 0 0' }}>
          {GARDEN_SUBTITLE}
        </h1>
        <GoldRule />
        {/* The room's own source, in the treatment an exhibit gives its
            own: gold rule, italic serif passage, gold citation. */}
        <blockquote style={{ borderLeft: `3px solid ${ag.gold}`, paddingLeft: 18, margin: 0 }}>
          <p style={{ fontFamily: ag.serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.62, color: ag.quote, margin: 0 }}>
            {FIELD_PASSAGE}
          </p>
          <p style={{ fontFamily: ag.ui, fontSize: 13, fontWeight: 600, color: ag.gold, margin: '10px 0 0' }}>
            {FIELD_CITATION}
          </p>
        </blockquote>
        <p style={{ fontFamily: ag.ui, fontSize: 16, lineHeight: 1.65, color: ag.body, margin: '22px 0 0' }}>
          Every exhibit belongs to one of the three.
        </p>
      </div>

      {thinkers.length > 1 ? (
        <div style={{ marginBottom: 40 }}>
          <Kicker>By thinker</Kicker>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <TopicChip label="All" on={!thinker} onClick={() => setThinker(null)} />
            {thinkers.map(t => (
              <TopicChip
                key={t}
                label={t}
                on={thinker === t}
                onClick={() => setThinker(thinker === t ? null : t)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <EmptyNote>Loading</EmptyNote>
      ) : error ? (
        <EmptyNote>{error}</EmptyNote>
      ) : (
        /* All three branches, always, whether or not anything is planted in
           them. The field is the organizing idea of the room, and a barren
           section says where the Garden has yet to grow rather than hiding
           that there is ground there. */
        BRANCHES.map(branch => {
          const rows = byBranch(shown, branch);
          return (
            <section key={branch} style={{ marginBottom: 48 }}>
              <Kicker>{BRANCH_LABEL[branch]}</Kicker>
              <p style={{ fontFamily: ag.ui, fontSize: 13, fontStyle: 'italic', color: ag.faint, margin: '4px 0 18px' }}>
                {BRANCH_GLOSS[branch]}
              </p>
              {!rows.length ? (
                <p style={{ fontFamily: ag.ui, fontSize: 14, fontStyle: 'italic', color: ag.faint, margin: 0 }}>
                  {thinker ? `Nothing from ${thinker} here yet.` : 'Nothing planted here yet.'}
                </p>
              ) : null}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14,
                }}
              >
                {rows.map(e => (
                  <button
                    key={e.id}
                    onClick={() => router.push(`/garden/${e.slug}`)}
                    style={{
                      textAlign: 'left', background: ag.card, border: `1px solid ${ag.border}`,
                      borderRadius: 2, padding: 20, cursor: 'pointer', color: 'inherit',
                    }}
                  >
                    <h2 style={{ fontFamily: ag.serif, fontSize: 21, fontWeight: 400, color: ag.text, margin: 0, lineHeight: 1.25 }}>
                      {e.title}
                    </h2>
                    <p style={{ fontFamily: ag.ui, fontSize: 14, lineHeight: 1.55, color: ag.body, margin: '10px 0 0' }}>
                      {e.summary}
                    </p>
                    {e.thinkers.length ? (
                      <p style={{ fontFamily: ag.ui, fontSize: 12, color: ag.muted, margin: '14px 0 0' }}>
                        {e.thinkers.join(' · ')}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
