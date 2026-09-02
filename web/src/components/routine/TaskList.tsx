'use client';

import type { RoutineTask } from './routineConfig';

export interface TaskListProps {
  tasks: RoutineTask[];
  /** While false, three skeleton cards stand in for the list. */
  loaded: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * The routine checklist. A done task inverts to a solid gold card with dark,
 * struck-through text, exactly as on mobile; the mobile swipe-to-delete is a
 * hover/tap ✕ here.
 */
export default function TaskList({ tasks, loaded, onToggle, onRemove }: TaskListProps) {
  if (!loaded) {
    return (
      <div className="px-4 flex flex-col gap-3 pb-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[14px]"
            style={{ height: 62, background: '#16213e', opacity: 0.4 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 flex flex-col gap-3 pb-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3.5 px-4 py-4 rounded-[14px] border transition-all duration-200 group"
          style={{
            background: task.done ? '#c9a84c' : '#16213e',
            borderColor: task.done ? '#c9a84c' : 'rgba(201,168,76,0.2)',
          }}
        >
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            aria-pressed={task.done}
            className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
          >
            <span
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0 border-2 text-[15px] leading-none"
              style={{
                borderColor: task.done ? '#1a1a2e' : '#c9a84c',
                background: task.done ? '#1a1a2e' : 'transparent',
                color: task.done ? '#c9a84c' : 'transparent',
              }}
            >
              ✓
            </span>
            <span className="flex-1 min-w-0">
              <span
                className="block text-[16px]"
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  color: task.done ? '#1a1a2e' : '#e6eef8',
                  fontWeight: task.done ? 700 : 500,
                  textDecoration: task.done ? 'line-through' : 'none',
                }}
              >
                {task.title}
              </span>
              {task.note && (
                <span
                  className="block text-[12px] mt-0.5"
                  style={{ color: task.done ? 'rgba(26,26,46,0.6)' : '#9aa0a6' }}
                >
                  {task.note}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onRemove(task.id)}
            aria-label={`Remove ${task.title}`}
            className="text-xs opacity-40 md:opacity-0 md:group-hover:opacity-70 transition-opacity flex-shrink-0 px-1"
            style={{ color: task.done ? '#1a1a2e' : '#9aa0a6' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
