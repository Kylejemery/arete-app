'use client';

import { DotLegend, RoutineDots, SectionCard } from './primitives';
import { dayKey, type DayMarks } from './types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The last seven days, oldest first, each with its two routine dots. Mobile
 * only ever filled in today (it initialised its calendar map to `{}`); here
 * every column is real, fed by a `check_ins` range query.
 */
export default function WeekStrip({ marks }: { marks: DayMarks }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return {
      key,
      label: WEEKDAYS[d.getDay()],
      date: d.getDate(),
      isToday: i === 6,
      morning: marks[key]?.morning ?? false,
      evening: marks[key]?.evening ?? false,
    };
  });

  return (
    <SectionCard title="This Week">
      <div className="flex justify-between">
        {days.map(day => (
          <div key={day.key} className="flex-1 flex flex-col items-center gap-1.5">
            <span
              className="text-[10px] tracking-[0.8px] uppercase"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: day.isToday ? '#c9a84c' : '#9aa0a6' }}
            >
              {day.label}
            </span>
            <span className="text-[13px]" style={{ color: day.isToday ? '#c9a84c' : '#e6eef8' }}>
              {day.date}
            </span>
            <RoutineDots morning={day.morning} evening={day.evening} />
          </div>
        ))}
      </div>
      <DotLegend />
    </SectionCard>
  );
}
