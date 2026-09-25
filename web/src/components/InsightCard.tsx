'use client';

// The weekly insight on the web Journal page (activation plan, Part 7.2).
// Until now only the mobile Journal tab pulled insights, so a member who
// used the web never received one. The server decides what is shown: nothing
// in a distress-flagged week, the first paragraph for the free tier (with
// the insight_tease upgrade prompt), the whole insight otherwise. Fetching
// marks it delivered, so this loads only when the Journal page opens.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/claudeService';
import { upgradeHref } from '@/lib/paywall';

interface Insight {
  id: string;
  insight_text: string;
  dominant_theme: string | null;
  analysis_week: string;
  teaser?: boolean;
}

const DISMISS_KEY = 'arete_insight_dismissed_week';

export default function InsightCard() {
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`${API_BASE_URL}/api/user/insight`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        const next: Insight | null = data?.insight?.insight_text ? data.insight : null;
        if (!next || cancelled) return;
        let dismissed: string | null = null;
        try { dismissed = localStorage.getItem(DISMISS_KEY); } catch {}
        if (dismissed !== next.analysis_week) setInsight(next);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!insight) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, insight.analysis_week); } catch {}
    setInsight(null);
  };
  const week = new Date(insight.analysis_week + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div
      className="mx-4 mt-4 mb-4 px-5 py-4"
      style={{ background: 'rgba(123,94,167,0.10)', border: '1px solid rgba(123,94,167,0.35)', borderRadius: 16 }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="text-[10px] tracking-[1.4px] uppercase" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
          Weekly Insight · Week of {week}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="text-[16px] leading-none" style={{ color: '#9aa0a6' }}>×</button>
      </div>
      {insight.dominant_theme && (
        <p className="text-[13px] italic font-semibold mb-1" style={{ color: '#b39ddb' }}>{insight.dominant_theme}</p>
      )}
      <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
        {insight.insight_text}
      </p>
      {insight.teaser && (
        <Link href={upgradeHref('insight_tease')} className="inline-block mt-3 text-[13px] font-semibold hover:underline" style={{ color: '#c9a84c' }}>
          Your counselors noticed a pattern this week. Unlock the full insight →
        </Link>
      )}
    </div>
  );
}
