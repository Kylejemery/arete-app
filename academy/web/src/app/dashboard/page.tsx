'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getEnrollment, getRecentSessions, getPapers, getProfile } from '@/lib/db';
import { Card, CardLabel } from '@/components/ui/Card';
import Topbar from '@/components/navigation/Topbar';
import AdvisorPanel from '@/components/AdvisorPanel';
import type { Enrollment, SeminarSession, Paper } from '@/types';

const COURSE_TITLES: Record<string, string> = {
  'phil-701': 'PHIL 701 — The Art of Living — Foundations',
  'phil-702': 'PHIL 702 — Living the Practice — Marcus Aurelius',
  'phil-703': 'PHIL 703 — The School of Epictetus',
  'phil-704': 'PHIL 704 — The Examined Correspondence — Seneca',
  'phil-706': 'PHIL 706 — The Impossibility of Willing Evil',
  'phil-707': 'PHIL 707 — The Prokopton in the Digital Age',
};

type ExamSignal = { label: string; href: string } | { done: true } | null;

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [sessions, setSessions] = useState<SeminarSession[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [userName, setUserName] = useState('');
  const [streak, setStreak] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [examSignal, setExamSignal] = useState<ExamSignal>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      setUserName(user.email?.split('@')[0] ?? 'Scholar');

      const todayStr = localToday();
      const [enroll, recentSessions, recentPapers, profile, passedRes, examRes] = await Promise.all([
        getEnrollment(),
        getRecentSessions(3),
        getPapers(),
        getProfile(),
        supabase
          .from('session_progress')
          .select('session_id')
          .eq('user_id', user.id)
          .eq('course_id', 'phil-701')
          .eq('status', 'passed')
          .limit(1),
        supabase
          .from('daily_examinations')
          .select('morning_completed_at, evening_completed_at')
          .eq('user_id', user.id)
          .eq('date', todayStr)
          .maybeSingle(),
      ]);

      setIsAdmin(profile?.is_admin === true);

      // Time-aware Daily Examination signal — only for active PHIL 701 students
      // (those with at least one passed session).
      if ((passedRes.data?.length ?? 0) > 0) {
        const examRow = examRes.data as
          | { morning_completed_at: string | null; evening_completed_at: string | null }
          | null;
        const hour = new Date().getHours();
        const morningDone = !!examRow?.morning_completed_at;
        const eveningDone = !!examRow?.evening_completed_at;
        if (morningDone && eveningDone) {
          setExamSignal({ done: true });
        } else if (!examRow && hour < 12) {
          setExamSignal({ label: 'Morning examination available', href: '/dashboard/examine' });
        } else if (morningDone && !eveningDone && hour >= 12) {
          setExamSignal({ label: 'Evening examination available', href: '/dashboard/examine' });
        }
      }

      if (!enroll) {
        // Auto-enroll new users as auditors
        const { upsertEnrollment } = await import('@/lib/db');
        await upsertEnrollment({ tier: 'auditor', current_course: 'phil-701' });
        setEnrollment({ id: '', user_id: user.id, program_id: 'stoicism-phd', current_course: 'phil-701', tier: 'auditor', enrolled_at: new Date().toISOString() });
      } else {
        setEnrollment(enroll);
      }

      setSessions(recentSessions);
      setPapers(recentPapers.slice(0, 3));

      // Compute streak from sessions
      const sessionDays = new Set(recentSessions.map(s => s.created_at.split('T')[0]));
      setStreak(sessionDays.size);

      setLoaded(true);
    }
    load();
  }, [router]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-academy-muted italic text-sm">Preparing your seminar room...</p>
      </div>
    );
  }

  const currentCourse = enrollment?.current_course ?? 'phil-701';
  const courseTitle = COURSE_TITLES[currentCourse] ?? currentCourse;

  return (
    <div>
      <Topbar
        title={`Welcome back, ${userName}.`}
        subtitle="The examined life continues."
        action={isAdmin ? (
          <span className="text-[10px] font-bold tracking-widest uppercase text-academy-gold border border-academy-gold/50 rounded-full px-2.5 py-1 leading-none">
            Admin
          </span>
        ) : undefined}
      />

      {/* Streak */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="col-span-2 md:col-span-1">
          <p className="text-4xl font-bold text-academy-gold mb-1">{streak}</p>
          <p className="text-academy-text text-sm font-medium">Days Studied</p>
          <p className="text-academy-muted text-xs mt-0.5 italic">Keep the chain unbroken</p>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <p className="text-4xl font-bold text-academy-gold mb-1">{sessions.length}</p>
          <p className="text-academy-text text-sm font-medium">Seminars Held</p>
          <p className="text-academy-muted text-xs mt-0.5 italic capitalize">{enrollment?.tier ?? 'Auditor'} standing</p>
        </Card>
        <Card className="col-span-2">
          <CardLabel>Current Standing</CardLabel>
          <p className="text-academy-text text-sm font-semibold capitalize">
            {enrollment?.tier ?? 'Auditor'} — Advanced Study in Stoic Philosophy
          </p>
          <p className="text-academy-muted text-xs mt-1">{courseTitle}</p>
        </Card>
      </div>

      {/* Daily Examination signal */}
      {examSignal && 'label' in examSignal && (
        <Link href={examSignal.href}>
          <Card className="mb-6 hover:border-academy-gold transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardLabel>Daily Examination</CardLabel>
                <p className="font-serif text-academy-text text-base">{examSignal.label}</p>
              </div>
              <span className="text-academy-gold text-sm font-semibold whitespace-nowrap">
                Begin &rarr;
              </span>
            </div>
          </Card>
        </Link>
      )}
      {examSignal && 'done' in examSignal && (
        <p className="text-academy-muted text-sm italic mb-6">
          Daily examination complete for today.
        </p>
      )}

      {/* The Paidagōgos — academic advisor: completed work, next task, readings due */}
      <AdvisorPanel userName={userName} />

      {/* Program Curriculum */}
      <div className="mb-8">
        <CardLabel>Your Program</CardLabel>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          {/* PHIL 701 — available */}
          <Link href="/dashboard/courses/phil-701">
            <Card className="hover:border-academy-gold transition-colors cursor-pointer">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                PHIL 701 &middot; Gateway Seminar
              </p>
              <p className="font-serif text-academy-text text-base mb-1">
                The Art of Living — Foundations
              </p>
              <p className="text-academy-muted text-xs">Session I — What is Philosophy For?</p>
              <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
            </Card>
          </Link>

          {/* The Courtyard */}
          <Link href="/dashboard/courtyard">
            <Card className="hover:border-academy-gold transition-colors cursor-pointer">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                The Courtyard &middot; Forum
              </p>
              <p className="font-serif text-academy-text text-base mb-1">
                The Courtyard
              </p>
              <p className="text-academy-muted text-xs">Open philosophical discussion with fellow students.</p>
              <p className="text-academy-gold text-xs font-semibold mt-3">Enter the Courtyard &rarr;</p>
            </Card>
          </Link>

          {/* PHIL 702 */}
          {isAdmin ? (
            <Link href="/dashboard/courses/phil-702">
              <Card className="hover:border-academy-gold transition-colors cursor-pointer">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                  PHIL 702
                </p>
                <p className="font-serif text-academy-text text-base mb-1">
                  Living the Practice — Marcus Aurelius
                </p>
                <p className="text-academy-muted text-xs">Session I — The Man and His Book</p>
                <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
              </Card>
            </Link>
          ) : (
            <Card className="opacity-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                    PHIL 702
                  </p>
                  <p className="font-serif text-academy-text text-base mb-1">
                    Living the Practice — Marcus Aurelius
                  </p>
                  <p className="text-academy-muted text-xs">Unlocks upon completing PHIL 701</p>
                </div>
                <svg className="w-4 h-4 text-academy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </Card>
          )}

          {/* PHIL 703 */}
          {isAdmin ? (
            <Link href="/dashboard/courses/phil-703">
              <Card className="hover:border-academy-gold transition-colors cursor-pointer">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                  PHIL 703
                </p>
                <p className="font-serif text-academy-text text-base mb-1">
                  The School of Epictetus
                </p>
                <p className="text-academy-muted text-xs">Session I — The Former Slave and His School</p>
                <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
              </Card>
            </Link>
          ) : (
            <Card className="opacity-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                    PHIL 703
                  </p>
                  <p className="font-serif text-academy-text text-base mb-1">
                    The School of Epictetus
                  </p>
                  <p className="text-academy-muted text-xs">Unlocks upon completing PHIL 702</p>
                </div>
                <svg className="w-4 h-4 text-academy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </Card>
          )}

          {/* PHIL 704 */}
          {isAdmin ? (
            <Link href="/dashboard/courses/phil-704">
              <Card className="hover:border-academy-gold transition-colors cursor-pointer">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                  PHIL 704
                </p>
                <p className="font-serif text-academy-text text-base mb-1">
                  The Examined Correspondence — Seneca
                </p>
                <p className="text-academy-muted text-xs">Session I — Claim Yourself: The Correspondence Begins</p>
                <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
              </Card>
            </Link>
          ) : (
            <Card className="opacity-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                    PHIL 704
                  </p>
                  <p className="font-serif text-academy-text text-base mb-1">
                    The Examined Correspondence — Seneca
                  </p>
                  <p className="text-academy-muted text-xs">Unlocks upon completing PHIL 703</p>
                </div>
                <svg className="w-4 h-4 text-academy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </Card>
          )}

          {/* PHIL 706 — Year 2 */}
          {isAdmin ? (
            <Link href="/dashboard/courses/phil-706">
              <Card className="hover:border-academy-gold transition-colors cursor-pointer">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                  PHIL 706
                </p>
                <p className="font-serif text-academy-text text-base mb-1">
                  The Impossibility of Willing Evil
                </p>
                <p className="text-academy-muted text-xs">Session I — No One Does Wrong Willingly: The Socratic Foundation</p>
                <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
              </Card>
            </Link>
          ) : (
            <Card className="opacity-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                    PHIL 706
                  </p>
                  <p className="font-serif text-academy-text text-base mb-1">
                    The Impossibility of Willing Evil
                  </p>
                  <p className="text-academy-muted text-xs">Year 2 — unlocks upon completing PHIL 704 and PHIL 705</p>
                </div>
                <svg className="w-4 h-4 text-academy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </Card>
          )}

          {/* PHIL 707 — Year 2, applied capstone */}
          {isAdmin ? (
            <Link href="/dashboard/courses/phil-707">
              <Card className="hover:border-academy-gold transition-colors cursor-pointer">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                  PHIL 707
                </p>
                <p className="font-serif text-academy-text text-base mb-1">
                  The Prokopton in the Digital Age
                </p>
                <p className="text-academy-muted text-xs">Session I — The Engineered Impression: The Attention Economy on Stoic Terms</p>
                <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
              </Card>
            </Link>
          ) : (
            <Card className="opacity-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                    PHIL 707
                  </p>
                  <p className="font-serif text-academy-text text-base mb-1">
                    The Prokopton in the Digital Age
                  </p>
                  <p className="text-academy-muted text-xs">Year 2 — unlocks upon completing PHIL 706</p>
                </div>
                <svg className="w-4 h-4 text-academy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Language & Logic Tracks */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <CardLabel>Language &amp; Logic Tracks</CardLabel>
          <div className="flex-1 h-px bg-academy-border" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* GREK 101 — available */}
          <Link href="/dashboard/courses/grek-101">
            <Card className="hover:border-academy-gold transition-colors cursor-pointer border-t-2 border-t-academy-gold">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
                  GREK 101
                </p>
                <span className="text-academy-muted text-xs border border-academy-border rounded-full px-2 py-0.5">
                  Language Track
                </span>
              </div>
              <p className="font-serif text-academy-text text-base mb-1">
                Ancient Greek for Philosophers
              </p>
              <p className="text-academy-muted text-xs">
                Read Epictetus and Chrysippus in the original. Year 1, parallel track.
              </p>
              <p className="text-academy-gold text-xs font-semibold mt-3">Begin GREK 101 &rarr;</p>
            </Card>
          </Link>

          {/* LATN 101 — available */}
          <Link href="/dashboard/courses/latn-101">
            <Card className="hover:border-academy-gold transition-colors cursor-pointer border-t-2 border-t-academy-gold">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
                  LATN 101
                </p>
                <span className="text-academy-muted text-xs border border-academy-border rounded-full px-2 py-0.5">
                  Language Track
                </span>
              </div>
              <p className="font-serif text-academy-text text-base mb-1">
                Latin for Philosophers
              </p>
              <p className="text-academy-muted text-xs">
                Read Seneca and Cicero without a translator between you and the text. Year 1, parallel track.
              </p>
              <p className="text-academy-gold text-xs font-semibold mt-3">Begin LATN 101 &rarr;</p>
            </Card>
          </Link>

          {/* PHIL 705 — Stoic Logic */}
          {isAdmin ? (
            <Link href="/dashboard/courses/phil-705" className="md:col-span-2">
              <Card className="hover:border-academy-gold transition-colors cursor-pointer border-t-2 border-t-academy-gold">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
                    PHIL 705
                  </p>
                  <span className="text-academy-muted text-xs border border-academy-border rounded-full px-2 py-0.5">
                    Logic Track
                  </span>
                  <span className="text-academy-muted text-xs border border-academy-border rounded-full px-2 py-0.5">
                    Year 2
                  </span>
                </div>
                <p className="font-serif text-academy-text text-base mb-1">
                  The Logic of Clear Seeing
                </p>
                <p className="text-academy-muted text-xs">
                  Chrysippus&apos;s propositional logic, the theory of impressions, and the Stoic epistemology of assent. Year 2.
                </p>
                <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
              </Card>
            </Link>
          ) : (
            <Card className="opacity-50 border-t-2 border-t-academy-gold md:col-span-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
                      PHIL 705
                    </p>
                    <span className="text-academy-muted text-xs border border-academy-border rounded-full px-2 py-0.5">
                      Logic Track
                    </span>
                    <span className="text-academy-muted text-xs border border-academy-border rounded-full px-2 py-0.5">
                      Year 2
                    </span>
                  </div>
                  <p className="font-serif text-academy-text text-base mb-1">
                    The Logic of Clear Seeing
                  </p>
                  <p className="text-academy-muted text-xs">
                    Chrysippus&apos;s propositional logic, the theory of impressions, and the Stoic epistemology of assent. Year 2.
                  </p>
                  <p className="text-academy-muted text-xs mt-1.5 italic">Unlocks after PHIL 704</p>
                </div>
                <svg className="w-4 h-4 text-academy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <div>
          <CardLabel>Recent Seminars</CardLabel>
          {sessions.length === 0 ? (
            <Card>
              <p className="text-academy-muted text-sm italic">No seminars yet. Begin with PHIL 701.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <Link key={s.id} href={`/dashboard/courses/${s.course_id}`}>
                  <Card className="hover:border-academy-gold transition-colors cursor-pointer">
                    <p className="text-academy-text text-sm font-medium">
                      {COURSE_TITLES[s.course_id] ?? s.course_id}
                    </p>
                    <p className="text-academy-muted text-xs mt-1">
                      {s.messages.length} exchanges · {new Date(s.updated_at).toLocaleDateString()}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Papers */}
        <div>
          <CardLabel>Recent Papers</CardLabel>
          {papers.length === 0 ? (
            <Card>
              <p className="text-academy-muted text-sm italic">No papers yet. Submit your first after a seminar.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {papers.map(p => (
                <Link key={p.id} href="/dashboard/papers">
                  <Card className="hover:border-academy-gold transition-colors cursor-pointer">
                    <p className="text-academy-text text-sm font-medium">{p.title ?? 'Untitled Draft'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        p.status === 'reviewed'
                          ? 'border-academy-gold text-academy-gold'
                          : 'border-academy-border text-academy-muted'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-academy-muted text-xs">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
