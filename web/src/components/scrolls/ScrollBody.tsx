'use client';

import { Fragment } from 'react';

/** Matches whole URLs; trailing prose punctuation is stripped per-match. */
const URL_REGEX = /(https?:\/\/[^\s<>"'()]+)/g;

/** Any Amazon product URL collapses to its stable /dp/ASIN form. */
export function normalizeUrl(url: string): string {
  const asin = url.match(/amazon\.com(?:\/[^/]+)*\/dp\/([A-Z0-9]{10})/i)?.[1];
  return asin ? `https://www.amazon.com/dp/${asin}` : url;
}

function Paragraph({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <p
      className="mb-5"
      style={{
        fontFamily: 'var(--font-serif, Georgia, serif)',
        color: '#ddd',
        fontSize: 17,
        lineHeight: '30px',
        whiteSpace: 'pre-wrap',
      }}
    >
      {parts.map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <Fragment key={i}>{part}</Fragment>;
        const cleanUrl = part.replace(/[.,;:)]+$/, '');
        const trailing = part.slice(cleanUrl.length);
        return (
          <Fragment key={i}>
            <a
              href={normalizeUrl(cleanUrl)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#c9a84c', textDecoration: 'underline' }}
            >
              {cleanUrl}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </p>
  );
}

/**
 * The scroll text: blank-line-separated paragraphs in a measured reading
 * column, with bare URLs linkified.
 */
export default function ScrollBody({ body }: { body: string }) {
  return (
    <div style={{ maxWidth: '65ch', marginLeft: 'auto', marginRight: 'auto' }}>
      {body.split('\n\n').map((paragraph, i) => (
        <Paragraph key={i} text={paragraph} />
      ))}
    </div>
  );
}
