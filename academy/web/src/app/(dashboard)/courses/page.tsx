'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEnrollment } from '@/lib/db';
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
];

const TIER_RANK: Record<Tier, number> = { auditor: 0, scholar: 1, fellow: 2 };

export default function CoursesPage() {
  const [tier, setTier] = useState<Tier>('auditor');
  const [currentCourse, setCurrentCourse] = useState('phil-701');

  useEffect(() => {
    getEnrollment().then(e => {
      if (e) { setTier(e.tier); setCurrentCourse(e.current_course); }
    });
  }, []);

  const canAccess = (courseIndex: number) => {
    if (tier === 'auditor') return courseIndex === 0;
    return TIER_RANK[tier] >= 1;
  };

  return (
    <div>
      <Topbar
        title="Course Catalog"
        subtitle="PhD in Stoic Philosophy — four courses, primary texts only"
      />

      <div className="space-y-5">
        {COURSES.map((course, i) => {
          const accessible = canAccess(i);
          const isCurrent = course.id === currentCourse;
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
