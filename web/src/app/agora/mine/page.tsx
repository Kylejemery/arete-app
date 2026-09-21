'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAgoraViewer, listMyEssays, shortDate, type AgoraEssaySummary, type AgoraViewer, type EssayStatus } from '@/lib/agora';
import { ag, AcademyButton, EmptyNote, EssayIndexCard, GoldRule, Kicker, PageTitle, TextLink } from '@/components/agora';
import { upgradeHref } from '@/lib/paywall';

const STATUS_LABEL: Record<EssayStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  published: 'Published',
  returned: 'Returned with notes',
};

export default function MyEssaysPage() {
  const router = useRouter();
  const [essays, setEssays] = useState<AgoraEssaySummary[]>([]);
  const [viewer, setViewer] = useState<AgoraViewer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?redirectTo=/agora/mine'); return; }
      const [list, v] = await Promise.all([listMyEssays(), getAgoraViewer()]);
      if (cancelled) return;
      setEssays(list); setViewer(v); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const open = (e: AgoraEssaySummary) =>
    router.push(e.status === 'published' ? `/agora/${e.id}` : `/agora/submit?id=${e.id}`);

  return (
    <div style={{ padding: '48px 24px 64px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}><TextLink onClick={() => router.push('/agora')}>&larr; The Agora</TextLink></div>
      <Kicker>Yours</Kicker>
      <PageTitle>Your essays</PageTitle>
      <GoldRule />
      <div style={{ marginBottom: 32 }}>
        <AcademyButton variant="outline" onClick={() => router.push(viewer?.canWrite ? '/agora/submit' : upgradeHref('agora_submit'))}>
          Write a new essay
        </AcademyButton>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ color: ag.muted, fontFamily: ag.ui }}>Loading</div>
        ) : essays.length === 0 ? (
          <EmptyNote>Nothing yet. Begin where the thought actually started.</EmptyNote>
        ) : essays.map(e => (
          <EssayIndexCard
            key={e.id}
            kicker={STATUS_LABEL[e.status]}
            title={e.title}
            author={e.author_name}
            meta={shortDate(e.published_at ?? e.submitted_at ?? e.updated_at)}
            excerpt={e.excerpt}
            tags={e.tags}
            comments={e.status === 'published' ? e.comment_count : undefined}
            onClick={() => open(e)}
          />
        ))}
      </div>
    </div>
  );
}
