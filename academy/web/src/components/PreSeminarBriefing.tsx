'use client';

import { useEffect, useState } from 'react';
import { getLibraryForSession } from '@/data/library';

export interface BriefingData {
  session: number;
  title: string;
  problem: string;
  whyItMatters: string;
  watchFor: string[];
  yourTask: string;
}

interface PreSeminarBriefingProps extends BriefingData {
  courseId: string;
  isComplete?: boolean;
}

export default function PreSeminarBriefing({
  courseId,
  session,
  title,
  problem,
  whyItMatters,
  watchFor,
  yourTask,
  isComplete = false,
}: PreSeminarBriefingProps) {
  const storageKey = `briefing-collapsed-${courseId}-${session}`;
  const [collapsed, setCollapsed] = useState(false);
  const sessionReadings = getLibraryForSession(courseId, session);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'true') setCollapsed(true);
  }, [storageKey]);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  return (
    <div className="border-l-4 border-academy-gold mb-8 bg-academy-card border border-academy-border rounded-r-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-navy/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isComplete && (
            <span className="text-academy-gold text-xs font-mono">&#10003;</span>
          )}
          <div>
            <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-0.5">
              Pre-Seminar Briefing
            </p>
            <p className="font-serif text-academy-text text-base leading-snug">{title}</p>
          </div>
        </div>
        <span className="text-academy-muted text-xs ml-4 flex-shrink-0">
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-6 pb-6 space-y-5 border-t border-academy-border">
          {/* The Problem */}
          <div className="pt-5">
            <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
              The Problem
            </p>
            <p className="text-academy-text text-sm leading-relaxed">{problem}</p>
          </div>

          {/* Why It Matters */}
          {whyItMatters && (
            <div>
              <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
                Why It Matters
              </p>
              <p className="text-academy-muted text-sm leading-relaxed">{whyItMatters}</p>
            </div>
          )}

          {/* What to Watch For */}
          {watchFor.length > 0 && (
            <div>
              <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
                What to Watch For
              </p>
              <ul className="space-y-1.5">
                {watchFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-academy-muted">
                    <span className="text-academy-gold font-bold leading-none mt-0.5">&mdash;</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Your Task */}
          <div className="border-t border-academy-gold/20 pt-5">
            <p className="font-mono text-academy-muted text-xs uppercase tracking-widest mb-2">
              Your Task
            </p>
            <p className="font-serif text-academy-gold text-sm leading-relaxed italic">{yourTask}</p>
          </div>

          {sessionReadings.length > 0 && (
            <div className="border-t border-academy-border pt-5">
              <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-3">
                Further Reading
              </p>
              <ul className="space-y-2">
                {sessionReadings.map(item => {
                  const isOpen = item.accessType === 'open-access';
                  return (
                    <li key={item.id} className="text-sm text-academy-muted leading-relaxed">
                      {!isOpen && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 align-middle"
                          aria-hidden
                        />
                      )}
                      {item.author} ({item.year > 0 ? item.year : 'ancient'}) — {item.title}{' '}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`hover:underline whitespace-nowrap ${isOpen ? 'text-academy-gold' : 'text-amber-300'}`}
                      >
                        {isOpen ? 'Open' : 'Library'} &rarr;
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
