'use client';

// The longitudinal portrait — the user's own philosophical arc, read back to
// them. Reads `user_longitudinal_models`, which the weekly agent
// (server/longitudinal-user-model.js) rebuilds every Monday from the whole
// journal_analysis history. Nothing here is computed in the browser; this page
// is purely a reading surface.
//
// Deliberately restrained: prose first, serif, generous measure, no streaks, no
// scores-as-trophies, no emoji. Every section is conditional — a four-week-old
// account has emerging themes and nothing else, and that must look intentional
// rather than broken.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCounselorsBySlugs, getLongitudinalPortrait } from '@/lib/db';
import type { LongitudinalPortrait } from '@/lib/types';
import { useRequireUser } from '@/hooks/useRequireUser';
import { Spinner } from '@/components/ui';
import ThemeList from '@/components/progress/ThemeList';

// The agent writes this exact string on a user's very first model. It carries
// no information — there is nothing to compare against yet — so the section is
// suppressed rather than shown as a delta that says "First model generated."
const PLACEHOLDER_DELTA = 'First model generated.';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/** The agent writes prose with blank lines between paragraphs. */
function paragraphsOf(prose: string): string[] {
  return prose
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 pt-6" style={{ borderTop: '1px solid rgba(201,168,76,0.13)' }}>
      <h2
        className="text-[13px] tracking-[1.4px] uppercase mb-1.5"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
      >
        {title}
      </h2>
      {note && (
        <p className="text-[13px] leading-5 mb-4" style={{ color: '#7a7a90' }}>
          {note}
        </p>
      )}
      {children}
    </section>
  );
}

function RegisterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-2.5">
      <span className="text-[13px]" style={{ color: '#7a7a90' }}>
        {label}
      </span>
      <span className="text-[15px] capitalize" style={{ color: '#e8e8f0' }}>
        {value}
      </span>
    </div>
  );
}

export default function PortraitPage() {
  const { user, loading: authLoading } = useRequireUser();
  const [loading, setLoading] = useState(true);
  const [portrait, setPortrait] = useState<LongitudinalPortrait | null>(null);
  const [counselorNames, setCounselorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    void (async () => {
      const model = await getLongitudinalPortrait();
      if (cancelled) return;
      setPortrait(model);
      setLoading(false);

      // Affinity is stored by slug; resolve display names so the section reads
      // as people rather than identifiers. Failure here is cosmetic.
      const slugs = (model?.counselor_affinity ?? []).map(a => a.counselor);
      if (slugs.length) {
        try {
          const counselors = await getCounselorsBySlugs(slugs);
          if (cancelled) return;
          setCounselorNames(Object.fromEntries(counselors.map(c => [c.slug, c.name])));
        } catch {
          /* fall through to the raw slug */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const header = (
    <div className="px-7 pt-4 pb-2">
      <Link href="/progress" className="text-[13px] hover:opacity-80" style={{ color: '#c9a84c' }}>
        &lsaquo; Progress
      </Link>
      <h1
        className="text-[26px] font-medium mt-2"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
      >
        Portrait
      </h1>
    </div>
  );

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen">
        {header}
        <div className="flex items-center justify-center py-24">
          <Spinner size={24} />
        </div>
      </div>
    );
  }

  // No row yet: the agent skips users below its four-week threshold. This is
  // the normal state for a new account, so it reads as an invitation.
  if (!portrait || !portrait.philosophical_portrait) {
    return (
      <div className="min-h-screen">
        {header}
        <div className="flex flex-col items-center justify-center text-center px-10 py-24 max-w-[560px] mx-auto">
          <p
            className="text-[20px] mb-3.5"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e8e8f0' }}
          >
            Your portrait is still forming.
          </p>
          <p
            className="text-[15px] leading-[26px]"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#8a8aa0' }}
          >
            It is written from your own journal entries, and it needs about four weeks of them
            before there is an arc worth describing. Keep writing. It will appear here on a Monday.
          </p>
        </div>
      </div>
    );
  }

  const persistent = portrait.persistent_themes ?? [];
  const emerging = portrait.emerging_themes ?? [];
  const fading = portrait.fading_themes ?? [];
  const edges = portrait.growth_edges ?? [];
  const affinity = (portrait.counselor_affinity ?? []).slice(0, 5);
  const weeks = portrait.weeks_analyzed ?? 0;
  const showDelta = Boolean(portrait.delta_summary && portrait.delta_summary.trim() !== PLACEHOLDER_DELTA);
  const hasRegister = Boolean(
    portrait.dominant_philosophical_orientation ||
      portrait.emotional_tone_baseline ||
      portrait.self_disclosure_depth
  );

  return (
    <div className="min-h-screen pb-16">
      {header}
      <div className="px-7 pt-2 max-w-[680px]">
        <p className="text-[13px] tracking-[0.3px] mb-7" style={{ color: '#8a8aa0' }}>
          {weeks} {weeks === 1 ? 'week' : 'weeks'} of your own writing, read back to you.
        </p>

        {/* The portrait itself — the reason this page exists. */}
        {paragraphsOf(portrait.philosophical_portrait).map((p, i) => (
          <p
            key={i}
            className="text-[17px] leading-[29px] mb-5"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e8e8f0' }}
          >
            {p}
          </p>
        ))}

        {showDelta && (
          <Section title="What moved this week">
            <p
              className="text-[16px] leading-[27px]"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e8e8f0' }}
            >
              {portrait.delta_summary}
            </p>
          </Section>
        )}

        {edges.length > 0 && (
          <Section
            title="Where you are still working"
            note="Questions you have returned to without settling."
          >
            {edges.map((edge, i) => (
              <p
                key={i}
                className="text-[16px] leading-[27px] mb-4"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#d8d8e4' }}
              >
                {edge}
              </p>
            ))}
          </Section>
        )}

        <ThemeList
          themes={persistent}
          title="What persists"
          note="Present across most of the weeks you have written."
        />
        <ThemeList
          themes={emerging}
          title="What is new"
          note="Appearing for the first or second time."
        />
        <ThemeList
          themes={fading}
          title="What has quieted"
          note="Once constant, absent from your recent weeks."
        />

        {hasRegister && (
          <Section title="Register">
            {portrait.dominant_philosophical_orientation && (
              <RegisterRow label="Orientation" value={portrait.dominant_philosophical_orientation} />
            )}
            {portrait.emotional_tone_baseline && (
              <RegisterRow label="Tone" value={portrait.emotional_tone_baseline} />
            )}
            {portrait.self_disclosure_depth && (
              <RegisterRow label="Candor" value={portrait.self_disclosure_depth} />
            )}
          </Section>
        )}

        {affinity.length > 0 && (
          <Section title="Who you have been sitting with">
            {affinity.map(a => (
              <div key={a.counselor} className="flex justify-between items-baseline gap-4 py-2.5">
                <span className="text-[15px] capitalize" style={{ color: '#e8e8f0' }}>
                  {counselorNames[a.counselor] ?? a.counselor}
                </span>
                <span className="text-[13px]" style={{ color: '#7a7a90' }}>
                  {a.count} {a.count === 1 ? 'conversation' : 'conversations'}
                </span>
              </div>
            ))}
          </Section>
        )}

        <p
          className="text-[12px] leading-5 mt-9 pt-5"
          style={{ color: '#6a6a80', borderTop: '1px solid rgba(201,168,76,0.10)' }}
        >
          Rebuilt {formatDate(portrait.portrait_updated_at ?? portrait.last_analyzed_at)}. Written
          from your journal entries alone, and visible only to you.
        </p>
      </div>
    </div>
  );
}
