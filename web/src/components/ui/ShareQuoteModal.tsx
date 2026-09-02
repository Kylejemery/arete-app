'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';

const CARD_W = 1080;
const CARD_H = 1350;
const SCALE = 2;
const PAD = 96;

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Helvetica, Arial, sans-serif';

/** Trim to something card-sized, ending at a sentence when possible. */
export function trimQuoteForCard(quote: string): string {
  const clean = quote.trim().replace(/\s+/g, ' ');
  if (clean.length <= 320) return clean;
  const cut = clean.slice(0, 320);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return lastStop > 120 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + '…';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCard(canvas: HTMLCanvasElement, quote: string, counselorName: string): void {
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(SCALE, SCALE);

  // Ground
  ctx.fillStyle = '#101a30';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Hairline gold frame
  ctx.strokeStyle = 'rgba(201,168,76,0.33)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, CARD_W - 48, CARD_H - 48);

  const maxWidth = CARD_W - PAD * 2;

  // Quote lines are measured with the final font so wrapping is accurate.
  const quoteSize = quote.length > 220 ? 44 : quote.length > 120 ? 52 : 60;
  const lineHeight = Math.round(quoteSize * 1.55);
  ctx.font = `400 ${quoteSize}px ${SERIF}`;
  const lines = wrapText(ctx, quote, maxWidth);

  const glyphHeight = 110;
  const ruleGap = 56;
  const nameGap = 44;
  const viaGap = 34;
  const blockHeight = glyphHeight + lines.length * lineHeight + ruleGap + nameGap + viaGap;

  const footerY = CARD_H - PAD;
  const available = footerY - 90 - PAD;
  let y = PAD + Math.max(0, (available - blockHeight) / 2);

  // Opening glyph
  ctx.fillStyle = '#c9a84c';
  ctx.font = `400 96px ${SERIF}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('❝', PAD, y + 80);
  y += glyphHeight;

  // The counsel itself
  ctx.fillStyle = '#e8e2cf';
  ctx.font = `400 ${quoteSize}px ${SERIF}`;
  for (const line of lines) {
    y += lineHeight;
    ctx.fillText(line, PAD, y);
  }

  // Gold rule
  y += ruleGap;
  ctx.fillStyle = '#c9a84c';
  ctx.fillRect(PAD, y, 132, 5);

  // Counselor, uppercase and letter-spaced
  y += nameGap;
  ctx.fillStyle = '#c9a84c';
  ctx.font = `700 34px ${SANS}`;
  const spacedName = counselorName.toUpperCase().split('').join(' ');
  ctx.fillText(spacedName, PAD, y + 24);

  // Attribution
  y += viaGap;
  ctx.fillStyle = '#8890a8';
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText('via the Cabinet', PAD, y + 44);

  // Footer
  ctx.fillStyle = '#c9a84c';
  ctx.font = `800 30px ${SANS}`;
  ctx.fillText('A R E T E', PAD, footerY);

  ctx.fillStyle = '#7b8298';
  ctx.font = `italic 400 26px ${SERIF}`;
  const tagline = 'Be who you want to be.';
  ctx.fillText(tagline, CARD_W - PAD - ctx.measureText(tagline).width, footerY);
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(header)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export interface ShareQuoteModalProps {
  open: boolean;
  onClose: () => void;
  quote: string;
  counselorName: string;
}

/**
 * Renders a counselor line as the branded Arete quote card and offers it as a
 * PNG — downloaded, or handed to the Web Share sheet where that exists.
 * Every share is the app introducing itself in someone else's feed.
 */
export default function ShareQuoteModal({ open, onClose, quote, counselorName }: ShareQuoteModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [canWebShare, setCanWebShare] = useState(false);
  const [sharing, setSharing] = useState(false);

  const display = trimQuoteForCard(quote);

  useEffect(() => {
    if (!open) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch { /* draw with whatever is loaded */ }
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        drawCard(canvas, display, counselorName);
        if (!cancelled) setDataUrl(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('[share-quote] render failed:', (e as Error)?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, display, counselorName]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.canShare) return;
    try {
      const probe = new File([new Uint8Array([0])], 'probe.png', { type: 'image/png' });
      setCanWebShare(navigator.canShare({ files: [probe] }));
    } catch {
      setCanWebShare(false);
    }
  }, []);

  const share = useCallback(async () => {
    if (!dataUrl || sharing) return;
    setSharing(true);
    try {
      const file = dataUrlToFile(dataUrl, 'arete-counsel.png');
      await navigator.share({ files: [file], title: 'Arete', text: 'Share this counsel' });
    } catch (e) {
      const err = e as Error;
      if (err?.name !== 'AbortError') console.warn('[share-quote] failed:', err?.message);
    } finally {
      setSharing(false);
    }
  }, [dataUrl, sharing]);

  return (
    <Modal open={open} onClose={onClose} sheet maxWidth={420}>
      <div className="flex flex-col items-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`Quote card: ${display}`}
            className="w-full rounded-xl"
            style={{ border: '1px solid rgba(201,168,76,0.33)' }}
          />
        ) : (
          <div className="py-16">
            <Spinner label="Preparing" />
          </div>
        )}

        <div className="mt-4 flex gap-3 justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl text-sm font-semibold hover:opacity-80"
            style={{ border: '1px solid rgba(255,255,255,0.13)', color: '#aaa' }}
          >
            Cancel
          </button>
          <a
            href={dataUrl ?? '#'}
            download="arete-counsel.png"
            aria-disabled={!dataUrl}
            className={`px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 ${dataUrl ? '' : 'pointer-events-none opacity-40'}`}
            style={{ border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}
          >
            Download
          </a>
          {canWebShare && (
            <button
              type="button"
              onClick={share}
              disabled={!dataUrl || sharing}
              className="px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
              style={{ background: '#c9a84c', color: '#1a1a2e' }}
            >
              {sharing ? 'Sharing…' : 'Share'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
