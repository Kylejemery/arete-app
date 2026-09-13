'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getAgoraViewer, listReviewQueue, paragraphs, publishEssay, readingMinutes, returnEssay, shortDate,
  type AgoraEssay,
} from '@/lib/agora';
import { ag, AcademyButton, EmptyNote, fieldStyle, GoldRule, Kicker, PageTitle, TextLink } from '@/components/agora';

// The editor's desk: every essay waiting to be read, oldest first.
export default function ReviewPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<AgoraEssay[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?redirectTo=/agora/review'); return; }
      const v = await getAgoraViewer();
      if (!v?.isEditor) { router.replace('/agora'); return; }
      const q = await listReviewQueue();
      if (cancelled) return;
      setQueue(q); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const act = async (fn: () => Promise<void>, id: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await fn();
      setQueue(q => q.filter(e => e.id !== id));
      setOpenId(null); setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: '48px 24px 64px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}><TextLink onClick={() => router.push('/agora')}>&larr; The Agora</TextLink></div>
      <Kicker>Editor</Kicker>
      <PageTitle>The review queue</PageTitle>
      <GoldRule />
      <p style={{ fontSize: 15, lineHeight: 1.65, color: ag.body, maxWidth: 560, margin: '0 0 32px', fontFamily: ag.ui }}>
        {queue.length === 1 ? 'One essay' : `${queue.length} essays`} waiting. Publish what belongs in the Agora; return the rest with a note.
      </p>
      {error && <p style={{ color: '#f87171', fontSize: 13, fontFamily: ag.ui, marginBottom: 16 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ color: ag.muted, fontFamily: ag.ui }}>Loading</div>
        ) : queue.length === 0 ? (
          <EmptyNote>The desk is clear.</EmptyNote>
        ) : queue.map(e => {
          const open = openId === e.id;
          return (
            <div key={e.id} style={{ background: ag.card, border: `1px solid ${open ? ag.gold27 : ag.border}`, borderRadius: 2, padding: 24 }}>
              <div onClick={() => { setOpenId(open ? null : e.id); setNote(''); }} style={{ cursor: 'pointer' }}>
                <Kicker style={{ marginBottom: 10 }}>Submitted {shortDate(e.submitted_at)} · {readingMinutes(e.body)} min</Kicker>
                <div style={{ fontFamily: ag.serif, fontSize: 22, color: ag.text, lineHeight: 1.25, marginBottom: 8 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: ag.gold, fontFamily: ag.ui }}>
                  {e.author_name}{e.tags.length ? <span style={{ color: ag.muted }}> · {e.tags.join(' · ')}</span> : null}
                </div>
                {!open && e.excerpt && <div style={{ fontSize: 14, lineHeight: 1.6, color: ag.body, marginTop: 12, fontFamily: ag.ui }}>{e.excerpt}</div>}
              </div>
              {open && (
                <>
                  <div style={{ fontSize: 17, lineHeight: 1.8, color: ag.body, margin: '22px 0 8px', fontFamily: ag.ui }}>
                    {paragraphs(e.body).map((p, i) => <p key={i} style={{ margin: '0 0 18px', whiteSpace: 'pre-wrap' }}>{p}</p>)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${ag.border}`, paddingTop: 20 }}>
                    <textarea value={note} onChange={ev => setNote(ev.target.value)} rows={3}
                      placeholder="A note to the author, if you are returning it." style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }} />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <AcademyButton disabled={busy} onClick={() => act(() => publishEssay(e.id), e.id)}>Publish</AcademyButton>
                      <AcademyButton variant="outline" disabled={busy || !note.trim()} onClick={() => act(() => returnEssay(e.id, note), e.id)}>
                        Return with note
                      </AcademyButton>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
