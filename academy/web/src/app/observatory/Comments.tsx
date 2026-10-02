'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { HANDLE_RE, getViewer, relativeTime, saveHandle, type Viewer } from '@/app/library/comments';
import { GOLD, IVORY, MONO, MUTED, SERIF, TEXT } from '@/app/library/theme';

// Reader comments under one Observatory piece (observatory_comments). Public
// to read; sign in, with a handle, to write. One level of replies: a reply to
// a reply files under the same root. The database sets the handle, checks the
// piece is published, and only ever lets a reader remove their own comment
// (supabase/migrations/20261001165829_observatory_comments.sql).

type Row = {
  id: string;
  parent_id: string | null;
  user_id: string;
  handle: string;
  body: string;
  removed_at: string | null;
  created_at: string;
  // Set only on the stand-in for a comment Kyle has hidden, which readers
  // cannot read: its replies stay, under a marker in its place.
  withheld?: boolean;
};

type Thread = { root: Row; replies: Row[] };

const COLUMNS = 'id, parent_id, user_id, handle, body, removed_at, created_at';

function toThreads(rows: Row[]): Thread[] {
  const byId = new Map(rows.map(r => [r.id, r]));
  const rootOf = (r: Row): Row => {
    let cur = r;
    for (let hops = 0; cur.parent_id && hops < 20; hops++) {
      const p = byId.get(cur.parent_id);
      if (!p) break;
      cur = p;
    }
    return cur;
  };
  const threads = new Map<string, Thread>();
  for (const r of rows) if (!r.parent_id) threads.set(r.id, { root: r, replies: [] });
  for (const r of rows) {
    if (!r.parent_id) continue;
    const top = rootOf(r);
    // A reply whose root is not readable answers a hidden comment. Keep the
    // reply, under a stand-in for the comment it answers.
    const key = top.parent_id ?? top.id;
    if (top.parent_id && !threads.has(key)) {
      threads.set(key, {
        root: { id: key, parent_id: null, user_id: '', handle: '', body: '', removed_at: null, created_at: r.created_at, withheld: true },
        replies: [],
      });
    }
    const t = threads.get(key);
    if (t) t.replies.push(r);
  }
  // A removed or hidden comment with no live replies has nothing left to hold its place.
  return [...threads.values()].filter(t => (!t.root.removed_at && !t.root.withheld) || t.replies.some(r => !r.removed_at));
}

export default function Comments({ kind, id }: { kind: string; id: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [viewerChecked, setViewerChecked] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [handleDraft, setHandleDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [signInHref, setSignInHref] = useState('/login');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('observatory_comments')
      .select(COLUMNS)
      .eq('piece_kind', kind)
      .eq('piece_id', id)
      .order('created_at', { ascending: true });
    if (error) { setErr('The conversation could not be loaded.'); setRows([]); return; }
    setRows((data || []) as Row[]);
  }, [kind, id]);

  useEffect(() => {
    load();
    getViewer().then(v => { setViewer(v); setViewerChecked(true); }).catch(() => setViewerChecked(true));
    setSignInHref(`/login?redirectTo=${encodeURIComponent(`${window.location.pathname}#comments`)}`);
  }, [load]);

  const threads = useMemo(() => toThreads(rows || []), [rows]);
  const live = (rows || []).filter(r => !r.removed_at).length;

  const post = async (body: string, parentId: string | null) => {
    const text = body.trim();
    if (!text || !viewer?.handle) return;
    if (text.length > 4000) { setErr('A comment runs to 4,000 characters at most.'); return; }
    setPosting(true); setErr(null);
    const { data, error } = await supabase
      .from('observatory_comments')
      .insert({ piece_kind: kind, piece_id: id, parent_id: parentId, user_id: viewer.userId, handle: viewer.handle, body: text })
      .select(COLUMNS)
      .single();
    setPosting(false);
    if (error || !data) { setErr('Your comment could not be saved. Try again in a moment.'); return; }
    setRows(r => [...(r || []), data as Row]);
    if (parentId) { setReplyTo(null); setReplyDraft(''); } else setDraft('');
  };

  const remove = async (rowId: string) => {
    if (!window.confirm('Remove your comment? Replies to it stay.')) return;
    const { data, error } = await supabase
      .from('observatory_comments')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', rowId)
      .select(COLUMNS)
      .single();
    if (error || !data) { setErr('That comment could not be removed.'); return; }
    setRows(r => (r || []).map(x => (x.id === rowId ? (data as Row) : x)));
  };

  const chooseHandle = async () => {
    if (!viewer) return;
    const h = handleDraft.trim();
    if (!HANDLE_RE.test(h)) { setErr('A handle is 3 to 20 letters, numbers, or underscores.'); return; }
    setPosting(true); setErr(null);
    try { await saveHandle(viewer.userId, h); setViewer({ ...viewer, handle: h }); }
    catch { setErr('That handle could not be saved. It may already be taken.'); }
    setPosting(false);
  };

  return (
    <section id="comments" style={{ marginTop: 56, scrollMarginTop: 24 }}>
      <style>{CSS}</style>
      <div style={{ height: 1, background: 'rgba(201,168,76,0.18)', marginBottom: 26 }} />
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, margin: '0 0 6px' }}>
        {live === 0 ? 'Comments' : live === 1 ? '1 comment' : `${live} comments`}
      </p>
      <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: MUTED, margin: '0 0 22px' }}>
        Answer the corpus, or each other. Comments are public and carry your handle.
      </p>

      {/* composer first, as on a journal: the invitation sits above the thread */}
      <div style={{ marginBottom: 30 }}>
        {!viewerChecked && <p className="obc-quiet">…</p>}
        {viewerChecked && !viewer && (
          <a href={signInHref} className="obc-locked">
            <span style={{ fontFamily: SERIF, fontSize: 16, color: GOLD }}>Sign in to join the conversation</span>
            <span className="obc-quiet" style={{ display: 'block', marginTop: 2 }}>Reading is free. Commenting needs an account, so every voice here is someone’s.</span>
          </a>
        )}
        {viewer && !viewer.handle && (
          <div>
            <p className="obc-quiet" style={{ marginBottom: 8 }}>Choose the handle other readers will see beside your comments.</p>
            <input value={handleDraft} onChange={e => setHandleDraft(e.target.value)} placeholder="your_handle" maxLength={20} className="obc-input"
              onKeyDown={e => { if (e.key === 'Enter') chooseHandle(); }} />
            <div className="obc-row"><button className="obc-send" disabled={posting} onClick={chooseHandle}>Use this handle</button></div>
          </div>
        )}
        {viewer?.handle && (
          <div>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} className="obc-input"
              placeholder="What does this piece get right, and where does it go wrong?"
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') post(draft, null); }} />
            <div className="obc-row">
              <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>as {viewer.handle} · public</span>
              <button className="obc-send" disabled={posting || !draft.trim()} onClick={() => post(draft, null)}>{posting ? 'Saving…' : 'Post'}</button>
            </div>
          </div>
        )}
        {err && <p style={{ fontFamily: SERIF, fontSize: 14, color: '#e08a7a', margin: '8px 0 0' }}>{err}</p>}
      </div>

      {rows === null && <p className="obc-quiet">Loading the conversation…</p>}
      {rows !== null && threads.length === 0 && (
        <p className="obc-quiet" style={{ textAlign: 'center', fontStyle: 'italic', padding: '8px 0 16px' }}>No one has answered yet. Be the first.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {threads.map(t => (
          <div key={t.root.id}>
            <CommentRow r={t.root} mine={!t.root.withheld && viewer?.userId === t.root.user_id} onRemove={() => remove(t.root.id)}
              onReply={viewer?.handle && !t.root.withheld ? () => { setReplyTo(t.root.id); setReplyDraft(''); } : undefined} />
            {t.replies.length > 0 && (
              <div style={{ marginLeft: 18, paddingLeft: 16, borderLeft: '1px solid rgba(201,168,76,0.18)', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {t.replies.map(r => (
                  <CommentRow key={r.id} r={r} mine={viewer?.userId === r.user_id} onRemove={() => remove(r.id)}
                    onReply={viewer?.handle && !r.removed_at ? () => { setReplyTo(t.root.id); setReplyDraft(`@${r.handle} `); } : undefined} />
                ))}
              </div>
            )}
            {replyTo === t.root.id && viewer?.handle && (
              <div style={{ marginLeft: 18, paddingLeft: 16, marginTop: 12 }}>
                <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)} rows={3} autoFocus className="obc-input"
                  placeholder={`Reply to ${t.root.removed_at || t.root.withheld ? 'this thread' : t.root.handle}…`}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') post(replyDraft, t.root.id); }} />
                <div className="obc-row">
                  <button className="obc-ghost" onClick={() => setReplyTo(null)}>Cancel</button>
                  <button className="obc-send" disabled={posting || !replyDraft.trim()} onClick={() => post(replyDraft, t.root.id)}>{posting ? 'Saving…' : 'Reply'}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CommentRow({ r, mine, onRemove, onReply }: { r: Row; mine: boolean; onRemove: () => void; onReply?: () => void }) {
  if (r.withheld) {
    return <p className="obc-quiet" style={{ fontStyle: 'italic', margin: 0 }}>This comment was hidden by the editor.</p>;
  }
  if (r.removed_at) {
    return <p className="obc-quiet" style={{ fontStyle: 'italic', margin: 0 }}>This comment was removed by its author.</p>;
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: SERIF, fontSize: 15.5, fontWeight: 600, color: mine ? GOLD : IVORY }}>{r.handle}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: '#666' }}>{relativeTime(r.created_at)}</span>
      </div>
      <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.6, color: TEXT, margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.body}</p>
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        {onReply && <button className="obc-link" onClick={onReply}>reply</button>}
        {mine && <button className="obc-link" onClick={onRemove}>remove</button>}
      </div>
    </div>
  );
}

const CSS = `
.obc-quiet { font-family: ${SERIF}; font-size: 15px; line-height: 1.5; color: ${MUTED}; margin: 0; }
.obc-locked { display: block; text-decoration: none; border: 1px dashed rgba(201,168,76,0.4); border-radius: 12px; padding: 16px 18px; transition: background 150ms ease-out; }
.obc-locked:hover { background: rgba(201,168,76,0.06); }
.obc-input { width: 100%; box-sizing: border-box; background: #0f1a30; border: 1px solid rgba(201,168,76,0.22); border-radius: 10px; padding: 12px 14px; color: ${IVORY}; font-family: ${SERIF}; font-size: 17px; line-height: 1.5; outline: none; resize: vertical; }
.obc-input:focus { border-color: rgba(201,168,76,0.6); }
.obc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; }
.obc-row > :only-child { margin-left: auto; }
.obc-send { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: #0a1020; background: ${GOLD}; border: none; border-radius: 10px; padding: 10px 16px; }
.obc-send:hover:not(:disabled) { background: #e3c77a; }
.obc-send:disabled { opacity: 0.5; cursor: default; }
.obc-ghost { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: ${MUTED}; background: none; border: none; padding: 10px 6px; }
.obc-link { cursor: pointer; font-family: ${MONO}; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: ${MUTED}; background: none; border: none; padding: 0; }
.obc-link:hover { color: ${GOLD}; }
`;
