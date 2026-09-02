'use client';

import Modal from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Replaces every native confirm() in the app. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth={420}>
      <p className="text-sm leading-relaxed" style={{ color: '#9aa0a6' }}>
        {message}
      </p>
      <div className="mt-6 flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
          style={{ border: '1px solid rgba(255,255,255,0.14)', color: '#9aa0a6' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          style={
            destructive
              ? { background: '#ff4444', color: '#fff' }
              : { background: '#c9a84c', color: '#0f1724' }
          }
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
