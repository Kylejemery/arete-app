'use client';

import { use, useEffect, useState } from 'react';
import { ag, EmptyNote } from '@/components/agora';
import ExhibitTemplate from '@/components/exhibits/ExhibitTemplate';
import { getExhibit, type Exhibit } from '@/lib/exhibits';

/**
 * One exhibit. Fetched by slug, so a workshop exhibit opens here for
 * testing while staying absent from the Garden index. Everything drawn on
 * this page is drawn by the template.
 */
export default function ExhibitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await getExhibit(slug);
        if (cancelled) return;
        if (!row) { setState('missing'); return; }
        setExhibit(row);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state === 'ready' && exhibit) return <ExhibitTemplate exhibit={exhibit} />;

  return (
    <div style={{ padding: 48, color: ag.muted }}>
      {state === 'loading' ? (
        <EmptyNote>Loading</EmptyNote>
      ) : (
        <EmptyNote>
          {state === 'missing' ? 'Nothing is planted here.' : 'This exhibit could not be reached.'}
        </EmptyNote>
      )}
    </div>
  );
}
