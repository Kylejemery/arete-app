'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEnrollment, getProfile } from '@/lib/db';
import { Card, CardLabel } from '@/components/ui/Card';
import Topbar from '@/components/navigation/Topbar';
import type { Course, Tier } from '@/types';

const COURSES: Course[] = [
  {
    id: 'phil-701',
    code: 'PHIL 701',
    title: 'Introduction to Stoic Philosophy',
    description: 'The foundations of the Stoic tradition — logos, virtue, and the dichotomy of control. Primary texts: Epictetus Enchiridion, selections from Marcus and Seneca.',
    term: 'Core — Required',
    assignedTexts: [
      { title: 'Enchiridion', author: 'Epictetus', sourceSlug: 'epictetus' },
      { title: 'Meditations (Books I–IV)', author: 'Marcus Aurelius', sourceSlug: 'marcus-aurelius' },
    ],
  },
  {
    id: 'phil-702',
    code: 'PHIL 702',
    title: 'The Meditations of Marcus Aurelius',
    description: 'A close reading of the Meditations in full. The text as philosophical practice, not doctrine. What does it mean to write to oneself?',
    term: 'Year 1',
    assignedTexts: [
      { title: 'Meditations (Complete)', author: 'Marcus Aurelius', sourceSlug: 'marcus-aurelius' },
    ],
  },
  {
    id: 'phil-703',
    code: 'PHIL 703',
    title: 'Epictetus and the Discipline of Desire',
    description: "The Discourses in depth. Epictetus's three disciplines and the radical claim that freedom is available to everyone — including slaves.",
    term: 'Year 1',
    assignedTexts: [
      { title: 'Discourses', author: 'Epictetus', sourceSlug: 'epictetus' },
    ],
  },
  {
    id: 'phil-704',
    code: 'PHIL 704',
    title: "Seneca's Letters and the Art of Dying Well",
    description: 'The Letters to Lucilius as a philosophy of time, friendship, and death. Reading Seneca as both thinker and specimen.',
    term: 'Year 2',
    assignedTexts: [
      { title: 'Letters to Lucilius', author: 'Seneca', sourceSlug: 'seneca' },
    ],
  },
  {
    id: 'phil-705',
    code: 'PHIL 705',
    title: 'Stoic Logic & Epistemology',
    description: 'The propositional logic system Chrysippus built 300 years before Frege. Twenty sessions from the lekton through the five indemonstrables to the Liar Paradox — and back to the examined life.',
    term: 'Year 2',
    assignedTexts: [
      { title: 'The Hellenistic Philosophers (Stoic Logic)', author: 'Long & Sedley', sourceSlug: 'epictetus' },
    ],
  },
  {
    id: 'grek-101',
    code: 'GREK 101',
    title: 'Ancient Greek for Philosophers',
    description: 'The Greek of the Stoics, from alphabet to philosophy. Ten sessions building toward a full grammatical reading of Epictetus Enchiridion §1.',
    term: 'Year 1',
    assignedTexts: [
      { title: 'Enchiridion §1', author: 'Epictetus', sourceSlug: 'epictetus' },
    ],
  },
  {
    id: 'latn-101',
    code: 'LATN 101',
    title: 'Latin for Philosophers',
    description: 'The Latin of Seneca, from alphabet to philosophy. Ten sessions building toward a reading of Epistulae Morales I.',
    term: 'Year 1',
    assignedTexts: [
      { title: 'Epistulae Morales I', author: 'Seneca', sourceSlug: 'seneca' },
    ],
  },
];

const TIER_RANK: Record<Tier, number> = { auditor: 0, scholar: 1, fellow: 2 };

// Courses accessible to every tier (no Scholar+ gate). PHIL 702–704 remain
// tier-gated unless the admin bypass is active.
const OPEN_ACCESS = new Set(['phil-701', 'phil-705', 'grek-101', 'latn-101']);

// Track badge by course id. PHIL 701–704 show no track badge (unchanged).
const TRACK_BADGE: Record<string, { label: string; color: string }> = {
  'phil-705': { label: 'Logic', color: '#C9A84C' },
  'grek-101': { label: 'Language', color: '#1a5c38' },
  'latn-101': { label: 'Language', color: '#4a2060' },
};

export default function CoursesPage() {
  const [tier, setTier] = useState<Tier>('auditor');
  const [currentCourse, setCurrentCourse] = useState('phil-701');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getEnrollment().then(e => {
      if (e) { setTier(e.tier); setCurrentCourse(e.current_course); }
    });
    getProfile().then(p => setIsAdmin(p?.is_admin === true));
  }, []);

  const adminBypass = isAdmin;

  // Admin bypass overrides every tier/prerequisite lock. Otherwise open-access
  // courses are always available; PHIL 702–704 require Scholar+.
  const canAccess = (course: Course) => {
    if (adminBypass) return true;
    if (OPEN_ACCESS.has(course.id)) return true;
    return TIER_RANK[tier] >= 1;
  };

  return (
    <div>
      <Topbar
        title="Course Catalog"
        subtitle="Advanced Study in Stoic Philosophy — the full curriculum"
        action={isAdmin ? (
          <span className="text-[10px] font-bold tracking-widest uppercase text-academy-gold border border-academy-gold/50 rounded-full px-2.5 py-1 leading-none">
            Admin
          </span>
        ) : undefined}
      />

      <div className="space-y-5">
        {COURSES.map((course) => {
          const accessible = canAccess(course);
          const isCurrent = course.id === currentCourse;
          const track = TRACK_BADGE[course.id];
          return (
            <Card key={course.id} gold={isCurrent} className={accessible ? '' : 'opacity-60'}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardLabel>{course.code}</CardLabel>
                    {isCurrent && (
                      <span className="text-xs bg-academy-gold/20 text-academy-gold px-2 py-0.5 rounded-full border border-academy-gold/30">
                        Current
                      </span>
                    )}
                    {track && (
                      <span
                        className="text-[10px] font-bold tracking-wider uppercase text-white rounded-full px-2 py-0.5 leading-none"
                        style={{ background: track.color }}
                      >
                        {track.label}
                      </span>
                    )}
                    <span className="text-xs text-academy-muted">{course.term}</span>
                  </div>
                  <h3 className="font-serif text-xl text-academy-text mb-2">{course.title}</h3>
                  <p className="text-academy-muted text-sm leading-relaxed mb-3">{course.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {course.assignedTexts.map(t => (
                      <span key={t.title} className="text-xs border border-academy-border rounded px-2 py-1 text-academy-muted">
                        📜 {t.title} — {t.author}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {accessible ? (
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="bg-academy-gold text-academy-bg font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity whitespace-nowrap block"
                    >
                      {isCurrent ? 'Enter Seminar →' : 'Open Course →'}
                    </Link>
                  ) : (
                    <div className="border border-academy-border rounded-lg px-5 py-2.5 text-sm text-academy-muted whitespace-nowrap">
                      Scholar+ required
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
