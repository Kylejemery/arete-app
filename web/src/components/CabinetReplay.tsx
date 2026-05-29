'use client';

import { useEffect, useState, useRef } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/app/id6762371595';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Exchange {
  counselor: string;
  initial: string;
  messages: Message[];
}

const exchanges: Exchange[] = [
  {
    counselor: 'Epictetus',
    initial: 'E',
    messages: [
      { role: 'user', text: 'What should I be focusing on right now?' },
      { role: 'assistant', text: 'That question can sometimes be a way of avoiding a simpler, harder one: why are you not doing what you already know you should? What is actually stopping you?' },
    ],
  },
  {
    counselor: 'Marcus Aurelius',
    initial: 'M',
    messages: [
      { role: 'user', text: 'My wife says she prefers the version of me that\'s at peace. I feel like Stoicism is almost... selfish.' },
      { role: 'assistant', text: 'When you are at peace, who else benefits? The peace you feel is not stolen from them. It is given to them. Which is actually selfish — the man who cultivates inner peace, or the man who makes his turmoil everyone else\'s problem?' },
    ],
  },
  {
    counselor: 'Marcus Aurelius',
    initial: 'M',
    messages: [
      { role: 'user', text: 'I lost my temper with my kid tonight. Over nothing. I hate myself for it.' },
      { role: 'assistant', text: 'Do not hate yourself. Examine yourself. There is a difference. What were you carrying into that moment that the child had no part in creating? The enemy was not them. The enemy arrived before they did.' },
    ],
  },
  {
    counselor: 'Theodore Roosevelt',
    initial: 'T',
    messages: [
      { role: 'user', text: 'If I were certain I wouldn\'t fail — I\'d go all in on my own thing. But I keep waiting.' },
      { role: 'assistant', text: 'The gap between \'soon\' and \'now\' is where intention goes to die quietly. You are not waiting for the right moment. You are waiting to feel certain. That feeling never comes. The arena does not care how ready you feel. It only cares whether you showed up.' },
    ],
  },
  {
    counselor: 'Marcus Aurelius',
    initial: 'M',
    messages: [
      { role: 'user', text: 'I was exhausted tonight. My kid pushed every button. I kept my mouth shut and said nothing. But I almost didn\'t.' },
      { role: 'assistant', text: 'That is a victory. Small, unglamorous, invisible to everyone but you and the people you did not wound. The man you are becoming is not built in dramatic breakthroughs. He is built in exactly these moments.' },
    ],
  },
];

// Static constellation dots
const DOTS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % 100,
  y: (i * 97.3) % 100,
  size: i % 5 === 0 ? 1.5 : 1,
  opacity: 0.08 + (i % 4) * 0.05,
}));

export default function CabinetReplay() {
  const [currentExchange, setCurrentExchange] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearAll() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }

  function schedule(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  }

  useEffect(() => {
    const exchange = exchanges[currentExchange];
    let elapsed = 0;

    // Reveal each message sequentially
    exchange.messages.forEach((msg, i) => {
      const delay = msg.role === 'user' ? 600 : 1800;
      elapsed += delay;
      const t = elapsed;
      schedule(() => setVisibleCount(i + 1), t);
    });

    // After all messages: wait 2500ms, fade out, then advance
    elapsed += 2500;
    schedule(() => setFading(true), elapsed);
    elapsed += 400;
    schedule(() => {
      setFading(false);
      setVisibleCount(0);
      setCurrentExchange(prev => (prev + 1) % exchanges.length);
    }, elapsed);

    return clearAll;
  }, [currentExchange]);

  const exchange = exchanges[currentExchange];

  return (
    <section
      style={{ backgroundColor: '#0a0a0f' }}
      className="relative w-full overflow-hidden py-20 px-4"
    >
      {/* Constellation background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {DOTS.map(d => (
          <circle
            key={d.id}
            cx={`${d.x}%`}
            cy={`${d.y}%`}
            r={d.size}
            fill="white"
            opacity={d.opacity}
          />
        ))}
      </svg>

      {/* Content */}
      <div className="relative z-10 mx-auto" style={{ maxWidth: 640 }}>
        {/* Eyebrow */}
        <p
          className="text-center mb-6"
          style={{
            color: '#C9A84C',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          Real conversations from the Cabinet
        </p>

        {/* Chat window */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 20,
            padding: '24px 20px',
            minHeight: 260,
            transition: 'opacity 400ms ease',
            opacity: fading ? 0 : 1,
          }}
        >
          <div className="flex flex-col gap-3">
            {exchange.messages.slice(0, visibleCount).map((msg, i) => (
              <BubbleRow
                key={`${currentExchange}-${i}`}
                msg={msg}
                counselorName={exchange.counselor}
                initial={exchange.initial}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BubbleRow({
  msg,
  counselorName,
  initial,
}: {
  msg: Message;
  counselorName: string;
  initial: string;
}) {
  const isUser = msg.role === 'user';

  return (
    <div
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{
        animation: 'cabinetBubbleIn 300ms ease forwards',
        opacity: 0,
      }}
    >
      {/* Counselor initial badge */}
      {!isUser && (
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-semibold"
          style={{
            width: 28,
            height: 28,
            background: '#C9A84C',
            color: '#0a0a0f',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 11,
            alignSelf: 'flex-end',
            marginBottom: 2,
          }}
        >
          {initial}
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: '78%' }}>
        {/* Counselor name label */}
        {!isUser && (
          <span
            style={{
              color: '#C9A84C',
              fontSize: 12,
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '0.04em',
            }}
          >
            {counselorName}
          </span>
        )}

        {/* Bubble */}
        <button
          onClick={() => window.open(APP_STORE_URL, '_blank')}
          style={{
            background: isUser ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            padding: '10px 14px',
            color: '#e6eef8',
            fontSize: 14,
            lineHeight: 1.5,
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'opacity 150ms',
            fontFamily: 'var(--font-serif, Georgia, serif)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {msg.text}
        </button>
      </div>
    </div>
  );
}
