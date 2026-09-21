'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  AGORA_TOPICS, getAgoraViewer, listPublishedEssays, listReviewQueue, shortDate,
  type AgoraEssaySummary, type AgoraViewer,
} from '@/lib/agora';
import { ag, AcademyButton, EmptyNote, EssayIndexCard, GoldRule, Kicker, TextLink } from '@/components/agora';
import { upgradeHref } from '@/lib/paywall';

export default function AgoraPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: ag.muted }}>Loading</div>}>
      <AgoraIndex />
    </Suspense>
  );
}

function AgoraIndex() {
  const router = useRouter();
  const params = useSearchParams();
  const topic = params.get('topic');
  const [essays, setEssays] = useState<AgoraEssaySummary[]>([]);
  const [viewer, setViewer] = useState<AgoraViewer | null>(null);
  const [queue, setQueue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?redirectTo=/agora'); return; }
      const [list, v] = await Promise.all([listPublishedEssays(topic), getAgoraViewer()]);
      if (cancelled) return;
      setEssays(list);
      setViewer(v);
      if (v?.isEditor) {
        const q = await listReviewQueue();
        if (!cancelled) setQueue(q.length);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router, topic]);

  const submit = () => router.push(viewer?.canWrite ? '/agora/submit' : upgradeHref('agora_submit'));

  return (
    <div style={{ padding: '48px 24px 64px', maxWidth: 1040, margin: '0 auto' }}>
      <div style={{ maxWidth: 640, marginBottom: 40 }}>
        <Kicker>The Agora</Kicker>
        <h1 style={{ fontFamily: ag.serif, fontSize: 46, fontWeight: 400, color: ag.text, lineHeight: 1.14, margin: '10px 0 0' }}>
          Essays by readers, open to argument
        </h1>
        <GoldRule />
        <p style={{ fontSize: 16, lineHeight: 1.65, color: ag.body, margin: '0 0 22px', fontFamily: ag.ui }}>
          Anyone who subscribes can submit. An editor reads every essay before it appears.
          Reading is free. Commenting is not.
        </p>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <AcademyButton variant="outline" onClick={submit}>Submit an essay</AcademyButton>
          <TextLink onClick={() => router.push('/agora/mine')}>Your essays</TextLink>
          {viewer?.isEditor && (
            <TextLink onClick={() => router.push('/agora/review')}>
              Review queue{queue ? ` · ${queue}` : ''}
            </TextLink>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {topic && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <Kicker>Topic · {topic}</Kicker>
              <TextLink onClick={() => router.push('/agora')} style={{ fontSize: 11 }}>All essays</TextLink>
            </div>
          )}
          {loading ? (
            <div style={{ color: ag.muted, fontFamily: ag.ui }}>Loading</div>
          ) : essays.length === 0 ? (
            <EmptyNote>
              {topic ? 'Nothing here yet. Submit the first one.' : 'Nothing in the Agora yet. Submit the first essay.'}
            </EmptyNote>
          ) : essays.map(e => (
            <EssayIndexCard
              key={e.id}
              kicker={e.counselor_name ? `Answered by ${e.counselor_name}` : e.is_editorial ? 'From the editor' : 'Essay'}
              title={e.title}
              author={e.author_name}
              meta={shortDate(e.published_at)}
              excerpt={e.excerpt}
              tags={e.tags}
              comments={e.comment_count}
              onClick={() => router.push(`/agora/${e.id}`)}
            />
          ))}
        </div>
        <div style={{ width: 200, flex: 'none' }}>
          <Kicker style={{ marginBottom: 16 }}>Topics</Kicker>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AGORA_TOPICS.map(t => (
              <span key={t} onClick={() => router.push(`/agora?topic=${encodeURIComponent(t)}`)} style={{
                fontSize: 14, color: t === topic ? ag.gold : ag.body, cursor: 'pointer', fontFamily: ag.ui,
                borderBottom: `1px solid ${ag.border}`, paddingBottom: 8,
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
