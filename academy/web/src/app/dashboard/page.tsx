'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getEnrollment, getRecentSessions, getPapers } from '@/lib/db';
import { Card, CardLabel } from '@/components/ui/Card';
import Topbar from '@/components/navigation/Topbar';
import type { Enrollment, SeminarSession, Paper } from '@/types';

const COURSE_TITLES: Record<string, string> = {
  'phil-701': 'PHIL 701 — Introduction to Stoic Philosophy',
  'phil-702': 'PHIL 702 — The Meditations of Marcus Aurelius',
  'phil-703': 'PHIL 703 — Epictetus and the Discipline of Desire',
  'phil-704': "PHIL 704 — Seneca's Letters",
};

export default function DashboardPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [sessions, setSessions] = useState<SeminarSession[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [userName, setUserName] = useState('');
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      setUserName(user.email?.split('@')[0] ?? 'Scholar');

      const [enroll, recentSessions, recentPapers] = await Promise.all([
        getEnrollment(),
        getRecentSessions(3),
        getPapers(),
      ]);

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
            {enrollment?.tier ?? 'Auditor'} — Stoic Philosophy PhD
          </p>
          <p className="text-academy-muted text-xs mt-1">{courseTitle}</p>
        </Card>
      </div>

      {/* Next Session CTA */}
      <Card gold className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardLabel>Next Seminar</CardLabel>
            <h3 className="font-serif text-xl text-academy-text mb-1">{courseTitle}</h3>
            <p className="text-academy-muted text-sm">
              Your Socratic Proctor is ready. The text awaits examination.
            </p>
          </div>
          <Link
            href={`/dashboard/courses/${currentCourse}`}
            className="flex-shrink-0 bg-academy-gold text-academy-bg font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Enter Seminar →
          </Link>
        </div>
      </Card>

      {/* Program Curriculum */}
      <div className="mb-8">
        <CardLabel>Your Program</CardLabel>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          {/* PHIL 701 — available */}
          <Link href="/courses/phil-701">
            <Card className="hover:border-academy-gold transition-colors cursor-pointer">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                PHIL 701 &middot; Gateway Seminar
              </p>
              <p className="font-serif text-academy-text text-base mb-1">
                Foundations of Stoic Ethics
              </p>
              <p className="text-academy-muted text-xs">Session I — What is Philosophy For?</p>
              <p className="text-academy-gold text-xs font-semibold mt-3">Enter Seminar &rarr;</p>
            </Card>
          </Link>

          {/* PHIL 702 — locked */}
          <Card className="opacity-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                  PHIL 702
                </p>
                <p className="font-serif text-academy-text text-base mb-1">
                  The Meditations of Marcus Aurelius
                </p>
                <p className="text-academy-muted text-xs">Unlocks upon completing PHIL 701</p>
              </div>
              <svg className="w-4 h-4 text-academy-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </Card>
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
