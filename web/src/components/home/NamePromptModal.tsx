'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';
import { upsertUserSettings } from '@/lib/db';

export interface NamePromptModalProps {
  open: boolean;
  /** Called with the saved name once `user_settings.user_name` is written. */
  onSaved: (name: string) => void;
  /** "Skip for now", the scrim and Escape all land here. */
  onSkip: () => void;
}

/**
 * Name capture, shown on Home when `user_settings.user_name` is empty. The
 * web deliberately does NOT redirect to /setup for this — the app is usable
 * without a name, and the skip is remembered for the session only.
 */
export default function NamePromptModal({ open, onSaved, onSkip }: NamePromptModalProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const name = value.trim();
  const canSave = name.length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await upsertUserSettings({ user_name: name });
      onSaved(name);
    } catch (e) {
      console.error('[Home] failed to save name:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onSkip} maxWidth={420}>
      <div
        className="text-[10px] tracking-[1.6px] uppercase"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
      >
        Welcome to Arete
      </div>

      <h2
        className="text-[24px] mt-2 leading-tight"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
      >
        What should we call you?
      </h2>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save();
        }}
        placeholder="Your name"
        maxLength={60}
        autoFocus
        autoComplete="name"
        className="w-full mt-4 px-4 py-3 rounded-xl text-[16px] outline-none"
        style={{
          background: '#1a1a2e',
          border: '1px solid rgba(201,168,76,0.3)',
          color: '#e6eef8',
        }}
      />

      <button
        type="button"
        onClick={() => void save()}
        disabled={!canSave}
        className="w-full mt-4 py-3.5 rounded-xl text-[14px] font-semibold tracking-wide transition-opacity"
        style={{
          background: '#c9a84c',
          color: '#0f1724',
          opacity: canSave ? 1 : 0.5,
          cursor: canSave ? 'pointer' : 'default',
        }}
      >
        {saving ? 'Saving…' : 'Continue'}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="w-full mt-3 text-[13px] hover:opacity-80"
        style={{ color: '#9aa0a6' }}
      >
        Skip for now
      </button>
    </Modal>
  );
}
