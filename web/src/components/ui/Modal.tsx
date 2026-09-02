'use client';

import { useEffect } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Slide up from the bottom edge on narrow viewports instead of centring. */
  sheet?: boolean;
  maxWidth?: number;
}

/**
 * The one dialog shell. Click the scrim or press Escape to dismiss; the panel
 * itself never closes on click. With `sheet`, it becomes a bottom sheet under
 * the md breakpoint, which is how the mobile app presents the same dialogs.
 */
export default function Modal({ open, onClose, title, children, sheet = false, maxWidth = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${sheet ? 'items-end md:items-center' : 'items-center'} p-0 md:p-6`}
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${sheet ? 'rounded-t-2xl md:rounded-2xl' : 'rounded-2xl mx-4'} p-6 max-h-[90vh] overflow-y-auto`}
        style={{
          maxWidth,
          background: '#16213e',
          border: '1px solid rgba(201,168,76,0.28)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        }}
      >
        {title && (
          <h2
            className="text-[20px] mb-4"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
