'use client';

import { useState } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { requestScroll } from '@/lib/scrolls';
import type { Scroll } from '@/lib/types';

export interface RequestScrollModalProps {
  open: boolean;
  onClose: () => void;
  userName: string | null;
  /** Called with the freshly written scroll once the server has answered. */
  onCreated: (scroll: Scroll) => void;
}

/**
 * The bottom-sheet request form. The server only writes the text; the row is
 * inserted client-side by `requestScroll`.
 */
export default function RequestScrollModal({ open, onClose, userName, onCreated }: RequestScrollModalProps) {
  const [topic, setTopic] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !topic.trim() || requesting;

  function close() {
    if (requesting) return;
    setError(null);
    onClose();
  }

  async function submit() {
    if (disabled) return;
    setRequesting(true);
    setError(null);
    try {
      const scroll = await requestScroll(topic, userName);
      if (!scroll) throw new Error('Something went wrong.');
      setTopic('');
      onCreated(scroll);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Request a Scroll" sheet>
      <div className="flex flex-col gap-3">
        <p className="text-[14px]" style={{ color: '#9aa0a6' }}>
          What do you want to work on?
        </p>

        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. I want to stop procrastinating on hard decisions"
          rows={4}
          disabled={requesting}
          autoFocus
          className="w-full rounded-xl px-3.5 py-3 text-[15px] leading-relaxed resize-none outline-none transition-colors"
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(201,168,76,0.25)',
            color: '#e6eef8',
            caretColor: '#c9a84c',
            minHeight: 100,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.55)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)';
          }}
        />

        {error && (
          <p className="text-[12px]" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#e57373' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="w-full rounded-xl py-4 text-[15px] font-semibold flex items-center justify-center gap-2.5"
          style={{
            background: disabled ? 'rgba(201,168,76,0.33)' : '#c9a84c',
            color: '#0f1724',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {requesting ? (
            <>
              <Spinner size={16} />
              <span>Your scroll is being written...</span>
            </>
          ) : (
            'Write My Scroll'
          )}
        </button>

        <button
          type="button"
          onClick={close}
          className="w-full py-2.5 text-[15px]"
          style={{ color: '#9aa0a6', cursor: requesting ? 'not-allowed' : 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
