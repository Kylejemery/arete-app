'use client';

import { DotLegend, RoutineDots, SectionCard } from './primitives';
import { dayKey, type DayMarks } from './types';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MonthCalendar({
  month,
  marks,
  onPrev,
  onNext,
}: {
  month: Date;
  marks: DayMarks;
  onPrev: () => void;
  onNext: () => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const todayKey = dayKey(new Date());
  const label = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const navStyle = {
    color: '#c9a84c',
    border: '1px solid rgba(201,168,76,0.28)',
  } as const;

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="w-8 h-8 rounded-lg text-[15px] leading-none hover:opacity-80"
          style={navStyle}
        >
          &lsaquo;
        </button>
        <h2
          className="text-[13px] tracking-[1.4px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          {label}
        </h2>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="w-8 h-8 rounded-lg text-[15px] leading-none hover:opacity-80"
          style={navStyle}
        >
          &rsaquo;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {DAY_LABELS.map(d => (
          <div
            key={d}
            className="text-center text-[9.5px] tracking-[1px] uppercase pb-1"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = dayKey(new Date(year, monthIndex, day));
          const isToday = key === todayKey;
          const mark = marks[key];
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 py-1.5 rounded-lg"
              style={isToday ? { border: '1px solid rgba(201,168,76,0.35)' } : undefined}
            >
              <span className="text-[12px]" style={{ color: isToday ? '#c9a84c' : '#e6eef8' }}>
                {day}
              </span>
              <RoutineDots morning={mark?.morning ?? false} evening={mark?.evening ?? false} />
            </div>
          );
        })}
      </div>
      <DotLegend />
    </SectionCard>
  );
}
