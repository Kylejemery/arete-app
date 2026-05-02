'use client';

import { useEffect, useState } from 'react';
import { getPapers, upsertPaper } from '@/lib/db';
import { Card, CardLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Topbar from '@/components/navigation/Topbar';
import type { Paper } from '@/types';

const COURSE_LABELS: Record<string, string> = {
  'phil-701': 'PHIL 701',
  'phil-702': 'PHIL 702',
  'phil-703': 'PHIL 703',
  'phil-704': 'PHIL 704',
};

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState('phil-701');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getPapers();
    setPapers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (status: 'draft' | 'submitted') => {
    setSaving(true);
    await upsertPaper({
      id: editingId ?? undefined,
      course_id: courseId,
      title: title.trim() || null,
      content: content.trim() || null,
      status,
    });
    setSaving(false);
    setComposing(false);
    setEditingId(null);
    setTitle('');
    setContent('');
    await load();
  };

  const handleEdit = (paper: Paper) => {
    setEditingId(paper.id);
    setTitle(paper.title ?? '');
    setContent(paper.content ?? '');
    setCourseId(paper.course_id);
    setComposing(true);
  };

  if (composing) {
    return (
      <div>
        <button
          onClick={() => { setComposing(false); setEditingId(null); setTitle(''); setContent(''); }}
          className="text-academy-muted hover:text-academy-text text-sm mb-6 inline-block transition-colors"
        >
          ← Back to Papers
        </button>

        <Topbar
          title={editingId ? 'Edit Paper' : 'New Paper'}
          subtitle="State your thesis. Defend it with textual evidence."
        />

        <div className="space-y-5 max-w-2xl">
          <div>
            <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">Course</label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="bg-academy-surface border border-academy-border rounded-lg px-4 py-2.5 text-academy-text focus:outline-none focus:border-academy-gold text-sm"
            >
              {Object.entries(COURSE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="The Dichotomy of Control in the Enchiridion"
              className="w-full bg-academy-surface border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:outline-none focus:border-academy-gold transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-academy-muted mb-1.5 uppercase tracking-wider">
              Body{' '}
              <span className="text-academy-muted normal-case font-normal">(thesis, argument, textual evidence)</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={18}
              placeholder="State your thesis in the first sentence. Every paragraph thereafter must advance the argument or provide evidence. Hedging language will be noted by the Examiner..."
              className="w-full bg-academy-surface border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:outline-none focus:border-academy-gold transition-colors text-sm font-serif resize-none leading-relaxed"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={() => handleSave('draft')} variant="ghost" disabled={saving}>
              Save Draft
            </Button>
            <Button onClick={() => handleSave('submitted')} disabled={saving || !content.trim()}>
              {saving ? 'Submitting…' : 'Submit for Examination'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar
        title="Papers"
        subtitle="Written argument is where thinking becomes visible"
        action={
          <Button onClick={() => setComposing(true)}>
            + New Paper
          </Button>
        }
      />

      {loading ? (
        <p className="text-academy-muted text-sm italic">Loading papers...</p>
      ) : papers.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-3xl mb-4">✒️</p>
            <p className="font-serif text-xl text-academy-text mb-2">No Papers Yet</p>
            <p className="text-academy-muted text-sm mb-6 max-w-sm mx-auto">
              After a seminar, write up your position. Submit it for examination by the Examiner agent.
            </p>
            <Button onClick={() => setComposing(true)}>Write Your First Paper</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {papers.map(paper => (
            <Card key={paper.id} gold={paper.status === 'reviewed'}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <CardLabel>{COURSE_LABELS[paper.course_id] ?? paper.course_id}</CardLabel>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      paper.status === 'reviewed'
                        ? 'border-academy-gold text-academy-gold'
                        : paper.status === 'submitted'
                        ? 'border-blue-500/40 text-blue-400'
                        : 'border-academy-border text-academy-muted'
                    }`}>
                      {paper.status}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg text-academy-text mb-1">{paper.title ?? 'Untitled Draft'}</h3>
                  {paper.content && (
                    <p className="text-academy-muted text-sm leading-relaxed line-clamp-2">
                      {paper.content}
                    </p>
                  )}
                  <p className="text-academy-muted text-xs mt-2">
                    Last updated {new Date(paper.updated_at).toLocaleDateString()}
                  </p>

                  {paper.feedback?.summary && (
                    <div className="mt-3 bg-academy-surface border-l-2 border-academy-gold p-3 rounded">
                      <p className="text-academy-gold text-xs font-semibold uppercase tracking-wider mb-1">Examiner Feedback</p>
                      <p className="text-academy-muted text-sm leading-relaxed">{paper.feedback.summary}</p>
                    </div>
                  )}
                </div>
                {paper.status === 'draft' && (
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(paper)}>
                    Edit
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
