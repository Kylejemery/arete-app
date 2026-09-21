'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  AGORA_TOPICS, deleteEssay, getAgoraViewer, getEssay, publishEditorial, saveEssay, wordCount,
  type AgoraEssay, type AgoraViewer, type EssayStatus,
} from '@/lib/agora';
import {
  ag, AcademyButton, fieldStyle, GoldRule, Kicker, PageTitle, SubmissionNotice, TextLink, TopicChip,
} from '@/components/agora';
import { upgradeHref } from '@/lib/paywall';

export default function SubmitPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: ag.muted }}>Loading</div>}>
      <SubmitForm />
    </Suspense>
  );
}

function SubmitForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  // An exhibit in the Garden can send a writer here with its agora_prompt
  // (see components/exhibits/ExhibitTemplate.tsx). The prompt seeds the
  // title, which is the question the essay answers.
  const prompt = params.get('prompt');
  const [viewer, setViewer] = useState<AgoraViewer | null>(null);
  const [existing, setExisting] = useState<AgoraEssay | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [isEditorial, setIsEditorial] = useState(true);
  const [state, setState] = useState<EssayStatus>('draft');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?redirectTo=/agora/submit'); return; }
      const v = await getAgoraViewer();
      if (cancelled) return;
      setViewer(v);
      if (!v?.canWrite) { router.replace(upgradeHref('agora_submit')); return; }
      if (editId) {
        const e = await getEssay(editId);
        if (cancelled) return;
        if (e) {
          setExisting(e); setTitle(e.title); setBody(e.body); setTags(e.tags);
          setAuthorName(e.author_name); setIsEditorial(e.is_editorial); setState(e.status);
        }
      } else if (prompt) {
        setTitle(prompt);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [editId, prompt, router]);

  const words = wordCount(body);
  const ready = title.trim().length > 0 && words > 0;
  const locked = state === 'in_review' || state === 'published';

  const save = async (status: 'draft' | 'in_review') => {
    if (!ready || busy) return;
    setBusy(true); setError(null);
    try {
      const e = await saveEssay({ title, body, tags }, status, existing?.id);
      setExisting(e); setState(e.status);
      if (status === 'in_review') router.push('/agora/mine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The essay was not saved.');
    } finally { setBusy(false); }
  };

  const publishNow = async () => {
    if (!ready || busy) return;
    setBusy(true); setError(null);
    try {
      const e = await publishEditorial({ title, body, tags, authorName, isEditorial }, existing?.id);
      router.push(`/agora/${e.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The essay was not published.');
      setBusy(false);
    }
  };

  const discard = async () => {
    if (!existing || !confirm('Discard this essay?')) return;
    try { await deleteEssay(existing.id); router.push('/agora/mine'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not discard.'); }
  };

  if (loading) return <div style={{ padding: 48, color: ag.muted, fontFamily: ag.ui }}>Loading</div>;

  return (
    <div style={{ padding: '48px 24px 72px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}><TextLink onClick={() => router.push('/agora')}>&larr; The Agora</TextLink></div>
      <Kicker>{existing ? 'Edit' : 'Submit'}</Kicker>
      <PageTitle>{viewer?.isEditor ? 'Write for the Agora' : 'Write for the Agora'}</PageTitle>
      <GoldRule />
      <p style={{ fontSize: 16, lineHeight: 1.65, color: ag.body, maxWidth: 600, margin: '0 0 32px', fontFamily: ag.ui }}>
        Say the true thing plainly. Essays run from eight hundred to three thousand words.
        An editor reads every submission before it appears, usually within a week.
      </p>

      <SubmissionNotice
        state={state}
        note={state === 'returned' && existing?.editor_note ? existing.editor_note : undefined}
        style={{ marginBottom: 28, maxWidth: 600 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 600 }}>
        <div>
          <Kicker style={{ marginBottom: 10 }}>Title</Kicker>
          <input value={title} onChange={e => setTitle(e.target.value)} style={fieldStyle}
            placeholder="On being early to everything" disabled={locked && !viewer?.isEditor} maxLength={200} />
        </div>
        <div>
          <Kicker style={{ marginBottom: 10 }}>Essay</Kicker>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={16}
            style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.7, fontSize: 16 }}
            placeholder="Begin where the thought actually started." disabled={locked && !viewer?.isEditor} />
          <div style={{ fontSize: 11, color: ag.faint, textAlign: 'right', marginTop: 6, fontFamily: ag.ui }}>{words} words</div>
        </div>
        <div>
          <Kicker style={{ marginBottom: 12 }}>Topics</Kicker>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {AGORA_TOPICS.map(t => (
              <TopicChip key={t} label={t} on={tags.includes(t)}
                onClick={() => setTags(s => s.includes(t) ? s.filter(x => x !== t) : s.length < 6 ? [...s, t] : s)} />
            ))}
          </div>
        </div>

        {viewer?.isEditor && (
          <div style={{ borderTop: `1px solid ${ag.border}`, paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Kicker>Editor</Kicker>
            <input value={authorName} onChange={e => setAuthorName(e.target.value)} style={fieldStyle}
              placeholder="Author name as it should appear (blank for your own)" />
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: ag.body, fontFamily: ag.ui, cursor: 'pointer' }}>
              <input type="checkbox" checked={isEditorial} onChange={e => setIsEditorial(e.target.checked)} />
              Mark as From the editor
            </label>
          </div>
        )}

        {error && <p style={{ color: '#f87171', fontSize: 13, fontFamily: ag.ui }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {viewer?.isEditor && (
            <AcademyButton onClick={publishNow} disabled={!ready || busy}>
              {state === 'published' ? 'Save changes' : 'Publish now'}
            </AcademyButton>
          )}
          {!locked && (
            <AcademyButton variant={viewer?.isEditor ? 'outline' : 'solid'} onClick={() => save('in_review')} disabled={!ready || busy}>
              Submit for review
            </AcademyButton>
          )}
          {!locked && (
            <AcademyButton variant="outline" onClick={() => save('draft')} disabled={!ready || busy}>Save draft</AcademyButton>
          )}
          {existing && (state === 'draft' || state === 'returned' || viewer?.isEditor) && (
            <TextLink onClick={discard} style={{ color: ag.muted, marginLeft: 8 }}>Discard</TextLink>
          )}
        </div>
        {locked && !viewer?.isEditor && (
          <p style={{ fontSize: 13, color: ag.muted, fontStyle: 'italic', fontFamily: ag.serif }}>
            {state === 'in_review'
              ? 'This essay is with the editor. It comes back to you if anything needs changing.'
              : 'This essay is live. Ask the editor for changes.'}
          </p>
        )}
      </div>
    </div>
  );
}
