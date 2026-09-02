'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChapterRule from '@/components/ChapterRule';
import { useSubscription } from '@/lib/useSubscription';

const ACADEMY_URL = 'https://academy.pursuearete.com';

const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
};

function AcademyIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.5" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M4 16.5A1.5 1.5 0 0 1 5.5 15H19" />
    </svg>
  );
}

function CardBody({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 p-4 w-full text-left">
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          background: 'rgba(201,168,76,0.12)',
          border: '1px solid rgba(201,168,76,0.3)',
          color: '#c9a84c',
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[15px]"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            {title}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[8px] tracking-[1.2px] uppercase"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              color: '#c9a84c',
              border: '1px solid rgba(201,168,76,0.45)',
            }}
          >
            Premium
          </span>
        </div>
        <div className="text-[12.5px] leading-snug mt-1" style={{ color: '#8A9BB0' }}>
          {subtitle}
        </div>
      </div>

      <span className="flex-shrink-0 text-[16px]" style={{ color: '#555' }} aria-hidden>
        ›
      </span>
    </div>
  );
}

/**
 * The mobile SideMenu, inlined. Two premium destinations beyond the core
 * tabs: the Academy (the marketing/course site) and the Library. Free tier
 * lands on the upgrade page with a labelled source instead.
 */
export default function ExploreRow() {
  const router = useRouter();
  const { tier, loading } = useSubscription();
  const locked = tier === 'free';

  const academy = (
    <CardBody
      icon={<AcademyIcon />}
      title="The Academy"
      subtitle="Courses and structured study in the classical tradition."
    />
  );
  const library = (
    <CardBody
      icon={<LibraryIcon />}
      title="The Library"
      subtitle="Read the original texts your counselors draw from."
    />
  );

  // Until the tier is known, the cards render inert rather than guessing a
  // destination — a wrong guess sends a paying member to the paywall.
  const wrap = (key: string, body: ReactNode, href: string, external: boolean, src: string) => {
    if (loading) {
      return (
        <div key={key} className="rounded-xl" style={CARD_STYLE}>
          {body}
        </div>
      );
    }
    if (locked) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => router.push(`/upgrade?src=${src}`)}
          className="rounded-xl text-left hover:opacity-90 transition-opacity"
          style={CARD_STYLE}
        >
          {body}
        </button>
      );
    }
    if (external) {
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl hover:opacity-90 transition-opacity"
          style={CARD_STYLE}
        >
          {body}
        </a>
      );
    }
    return (
      <Link key={key} href={href} className="rounded-xl hover:opacity-90 transition-opacity" style={CARD_STYLE}>
        {body}
      </Link>
    );
  };

  return (
    <div>
      <ChapterRule label="Explore" />
      <div className="grid gap-3 sm:grid-cols-2">
        {wrap('academy', academy, ACADEMY_URL, true, 'menu_academy')}
        {wrap('library', library, '/library', false, 'menu_library')}
      </div>
      <p
        className="text-center italic text-[12px] mt-4"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#6b7280' }}
      >
        Arete · Be who you want to be.
      </p>
    </div>
  );
}
