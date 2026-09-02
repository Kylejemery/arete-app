'use client';

import GlassCard from '@/components/GlassCard';
import { FocusBook } from './types';

interface BookListProps {
  books: FocusBook[];
  selectedId: string | null;
  /** Selection and deletion are locked while a reading session is running. */
  isRunning: boolean;
  onSelect: (book: FocusBook) => void;
  onAdd: () => void;
  onDelete: (book: FocusBook) => void;
  onFinish: (book: FocusBook) => void;
}

export default function BookList({
  books,
  selectedId,
  isRunning,
  onSelect,
  onAdd,
  onDelete,
  onFinish,
}: BookListProps) {
  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <span
            className="text-[10px] tracking-[1.8px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Currently Reading
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="text-[10px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            + Add Book
          </button>
        </div>

        {books.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-[14px] transition-opacity hover:opacity-80"
            style={{
              border: '1px dashed rgba(201,168,76,0.3)',
              color: '#c9a84c',
              fontFamily: 'var(--font-sans, system-ui)',
            }}
          >
            <span aria-hidden="true">+</span>
            Add a book you&apos;re reading!
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {books.map((book) => {
              const selected = selectedId === book.id;
              return (
                <div
                  key={book.id}
                  className="flex items-center gap-2 rounded-xl px-3 py-3"
                  style={{
                    background: selected ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selected ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(book)}
                    disabled={isRunning}
                    className="flex-1 min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <p
                      className="text-[14px] font-medium truncate"
                      style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                    >
                      {book.title}
                    </p>
                    {book.author && (
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        by {book.author}
                      </p>
                    )}
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                    >
                      Page {book.currentPage || book.startPage}
                    </p>
                  </button>

                  {selected && (
                    <span aria-hidden="true" style={{ color: '#c9a84c', fontSize: 15 }}>
                      ✓
                    </span>
                  )}

                  {!isRunning && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onFinish(book)}
                        className="text-[10px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                      >
                        Finished
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(book)}
                        aria-label={`Remove ${book.title}`}
                        className="text-[13px] transition-opacity hover:opacity-70"
                        style={{ color: '#ff4444' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
