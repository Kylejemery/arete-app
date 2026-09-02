'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';
import type { RoutineTemplate } from '@/lib/db';
import { templateLabel } from './routineConfig';

export interface EditRoutineModalProps {
  open: boolean;
  title: string;
  templates: RoutineTemplate[];
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
  onAdd: (title: string, emoji: string) => void | Promise<void>;
}

/**
 * The pencil sheet from the mobile routine screens: the persisted templates
 * with a per-row trash, plus an emoji + name + `+` add row. Editing templates
 * changes tomorrow's list, never today's — same as mobile.
 */
export default function EditRoutineModal({
  open,
  title,
  templates,
  onClose,
  onDelete,
  onAdd,
}: EditRoutineModalProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');

  const submit = async () => {
    if (!newTitle.trim()) return;
    await onAdd(newTitle.trim(), newEmoji.trim());
    setNewTitle('');
    setNewEmoji('');
  };

  return (
    <Modal open={open} onClose={onClose} title={title} sheet maxWidth={480}>
      <div className="max-h-[46vh] overflow-y-auto">
        {templates.length === 0 ? (
          <p className="text-[13px] py-2" style={{ color: '#9aa0a6' }}>
            No disciplines yet. Add one below.
          </p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: '1px solid rgba(201,168,76,0.13)' }}
            >
              <span className="text-[15px] flex-1 min-w-0" style={{ color: '#e6eef8' }}>
                {templateLabel(t.title, t.emoji)}
              </span>
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                aria-label={`Remove ${t.title}`}
                className="px-2 py-1 text-[13px] hover:opacity-100 opacity-60 transition-opacity"
                style={{ color: '#c9a84c' }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 pt-4">
        <input
          value={newEmoji}
          onChange={(e) => setNewEmoji(e.target.value)}
          maxLength={2}
          placeholder="😊"
          aria-label="Emoji"
          className="w-[52px] text-center rounded-[10px] px-2 py-3 text-[16px] outline-none"
          style={{
            background: '#0f1724',
            border: '1px solid rgba(201,168,76,0.2)',
            color: '#e6eef8',
          }}
        />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder="Task name..."
          aria-label="Task name"
          className="flex-1 min-w-0 rounded-[10px] px-3 py-3 text-[15px] outline-none"
          style={{
            background: '#0f1724',
            border: '1px solid rgba(201,168,76,0.2)',
            color: '#e6eef8',
          }}
        />
        <button
          type="button"
          onClick={() => void submit()}
          aria-label="Add discipline to routine"
          className="rounded-[10px] px-4 py-3 text-[18px] font-bold leading-none hover:opacity-90"
          style={{ background: '#c9a84c', color: '#1a1a2e' }}
        >
          +
        </button>
      </div>
    </Modal>
  );
}
