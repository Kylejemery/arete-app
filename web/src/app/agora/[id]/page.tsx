'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  deleteComment, getAgoraViewer, getEssay, listComments, paragraphs, postComment, postCounselorComment,
  readingMinutes, relativeTime, shortDate, unpublishEssay,
  type AgoraComment, type AgoraEssay, type AgoraViewer,
} from '@/lib/agora';
import {
  ag, AcademyButton, Comment, CommentComposer, EmptyNote, fieldStyle, GoldRule, Kicker, SubmissionNotice, TextLink,
} from '@/components/agora';

export default function EssayPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [essay, setEssay] = useState<AgoraEssay | null>(null);
  const [comments, setComments] = useState<AgoraComment[]>([]);
  const [viewer, setViewer] = useState<AgoraViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counselorName, setCounselorName] = useState('');
  const [counselorText, setCounselorText] = useState('');
  const [showCounselor, setShowCounselor] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace(`/login?redirectTo=/agora/${id}`); return; }
      const [e, c, v] = await Promise.all([getEssay(id), listComments(id), getAgoraViewer()]);
      if (cancelled) return;
      setEssay(e); setComments(c); setViewer(v); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, router]);

  const post = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const c = await postComment(id, draft);
      setComments(prev => [...prev, c]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The comment did not post.');
    } finally { setBusy(false); }
  };

  const postAsCounselor = async () => {
    if (!counselorName.trim() || !counselorText.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const c = await postCounselorComment(id, counselorName, counselorText);
      setComments(prev => [...prev, c]);
      setCounselorText(''); setShowCounselor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The answer did not post.');
    } finally { setBusy(false); }
  };

  const remove = async (cid: string) => {
    if (!confirm('Remove this comment?')) return;
    try {
      await deleteComment(cid);
      setComments(prev => prev.filter(c => c.id !== cid));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the comment.');
    }
  };

  const unpublish = async () => {
    if (!essay || !confirm('Take this essay down? It returns to a draft.')) return;
    try { await unpublishEssay(essay.id); router.push('/agora'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not unpublish.'); }
  };

  if (loading) return <div style={{ padding: 48, color: ag.muted, fontFamily: ag.ui }}>Loading</div>;

  if (!essay) {
    return (
      <div style={{ padding: '56px 24px' }}>
        <TextLink onClick={() => router.push('/agora')}>&larr; The Agora</TextLink>
        <div style={{ marginTop: 28 }}><EmptyNote>This essay is not in the Agora.</EmptyNote></div>
      </div>
    );
  }

  const own = viewer?.userId === essay.author_id;
  const published = essay.status === 'published';

  return (
    <div style={{ padding: '48px 24px 72px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}><TextLink onClick={() => router.push('/agora')}>&larr; The Agora</TextLink></div>

      {!published && (
        <SubmissionNotice
          state={essay.status}
          note={essay.status === 'returned' && essay.editor_note ? essay.editor_note : undefined}
          style={{ marginBottom: 28, maxWidth: 600 }}
        />
      )}

      <Kicker>{essay.tags.length ? essay.tags.join(' · ') : essay.is_editorial ? 'From the editor' : 'Essay'}</Kicker>
      <h1 style={{ fontFamily: ag.serif, fontSize: 42, fontWeight: 400, color: ag.text, lineHeight: 1.15, margin: '10px 0 0' }}>
        {essay.title}
      </h1>
      <div style={{ fontSize: 13, color: ag.gold, letterSpacing: '0.3px', marginTop: 14, fontFamily: ag.ui }}>
        {essay.author_name}
        <span style={{ color: ag.muted }}> · {shortDate(essay.published_at ?? essay.created_at)} · {readingMinutes(essay.body)} min</span>
      </div>
      <GoldRule />

      <div style={{ fontSize: 18, lineHeight: 1.8, color: ag.body, maxWidth: 640, fontFamily: ag.ui }}>
        {paragraphs(essay.body).map((p, i) => <p key={i} style={{ margin: '0 0 22px', whiteSpace: 'pre-wrap' }}>{p}</p>)}
      </div>

      {essay.counselor_name && essay.counselor_answer && (
        <div style={{ borderLeft: `3px solid ${ag.gold}`, paddingLeft: 20, margin: '32px 0 0', maxWidth: 640 }}>
          <Kicker>{essay.counselor_name} was invited to answer</Kicker>
          <div style={{ fontFamily: ag.serif, fontSize: 20, fontStyle: 'italic', lineHeight: 1.55, color: ag.text, marginTop: 10, whiteSpace: 'pre-wrap' }}>
            {essay.counselor_answer}
          </div>
        </div>
      )}

      {(own || viewer?.isEditor) && (
        <div style={{ display: 'flex', gap: 22, marginTop: 32, flexWrap: 'wrap' }}>
          {(!published || viewer?.isEditor) && (
            <TextLink onClick={() => router.push(`/agora/submit?id=${essay.id}`)}>Edit</TextLink>
          )}
          {viewer?.isEditor && published && <TextLink onClick={unpublish}>Unpublish</TextLink>}
          {viewer?.isEditor && published && (
            <TextLink onClick={() => setShowCounselor(s => !s)}>Answer as a counselor</TextLink>
          )}
        </div>
      )}

      {showCounselor && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, maxWidth: 600 }}>
          <input value={counselorName} onChange={e => setCounselorName(e.target.value)} placeholder="Seneca" style={fieldStyle} />
          <textarea value={counselorText} onChange={e => setCounselorText(e.target.value)} rows={4}
            placeholder="In the counselor's voice." style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }} />
          <div><AcademyButton onClick={postAsCounselor} disabled={busy}>Post the answer</AcademyButton></div>
        </div>
      )}

      {published && (
        <>
          <div style={{ height: 1, background: ag.border, margin: '44px 0 28px', maxWidth: 640 }} />
          <Kicker style={{ marginBottom: 22 }}>{comments.length === 1 ? '1 comment' : `${comments.length} comments`}</Kicker>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32, maxWidth: 600 }}>
            {comments.length === 0 && <EmptyNote>No one has answered yet.</EmptyNote>}
            {comments.map(c => (
              <Comment key={c.id} author={c.author_name} time={relativeTime(c.created_at)} counselor={c.is_counselor}
                onRemove={c.user_id === viewer?.userId || viewer?.isEditor ? () => remove(c.id) : undefined}>
                {c.body}
              </Comment>
            ))}
          </div>
          <div style={{ maxWidth: 600 }}>
            <CommentComposer
              locked={!viewer?.canWrite}
              onUnlock={() => router.push('/upgrade')}
              value={draft} onChange={setDraft} onSubmit={post} busy={busy}
            />
            {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 10, fontFamily: ag.ui }}>{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
