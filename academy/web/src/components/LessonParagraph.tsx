'use client';

import { parseTermMarkup } from '@/lib/parseTermMarkup';
import GreekTerm from '@/components/GreekTerm';

interface LessonParagraphProps {
  text: string;
  className?: string;
}

export default function LessonParagraph({ text, className }: LessonParagraphProps) {
  const segments = parseTermMarkup(text);
  return (
    <p className={className}>
      {segments.map((seg, i) =>
        seg.type === 'text'
          ? <span key={i}>{seg.content}</span>
          : <GreekTerm key={i} entryId={seg.id} displayText={seg.displayText} />
      )}
    </p>
  );
}
