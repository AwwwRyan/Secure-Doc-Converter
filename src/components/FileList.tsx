import { useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import type { SessionFile } from '@/lib/store/session';
import { withViewTransition } from '@/ui/viewTransition';
import { cn } from '@/ui/cn';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  files: SessionFile[];
  reorderable: boolean;
  disabled: boolean;
  onRemove: (id: string) => void;
  onMoveTo: (id: string, index: number) => void;
}

export function FileList({ files, reorderable, disabled, onRemove, onMoveTo }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; below: boolean } | null>(null);
  const canReorder = reorderable && files.length > 1 && !disabled;

  function drop() {
    if (!dragId || !over) return;
    const target = files.findIndex((f) => f.id === over.id);
    if (target === -1) return;
    const from = files.findIndex((f) => f.id === dragId);
    let to = over.below ? target + 1 : target;
    if (from < to) to -= 1;
    withViewTransition(() => onMoveTo(dragId, to));
    setDragId(null);
    setOver(null);
  }

  function nudge(id: string, dir: -1 | 1) {
    const i = files.findIndex((f) => f.id === id);
    if (i === -1) return;
    withViewTransition(() => onMoveTo(id, i + dir));
  }

  return (
    <ul className="flex flex-col gap-2" onDragLeave={() => setOver(null)}>
      {files.map((f) => (
        <li
          key={f.id}
          draggable={canReorder}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            setDragId(f.id);
          }}
          onDragOver={(e) => {
            if (!canReorder || !dragId) return;
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            setOver({ id: f.id, below: e.clientY > r.top + r.height / 2 });
          }}
          onDrop={(e) => {
            e.preventDefault();
            drop();
          }}
          onDragEnd={() => {
            setDragId(null);
            setOver(null);
          }}
          style={reorderable ? { viewTransitionName: `file-${f.id}` } : undefined}
          className={cn(
            'relative flex items-center gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-sm',
            dragId === f.id && 'opacity-50',
            over?.id === f.id &&
              (over.below
                ? 'after:absolute after:inset-x-2 after:-bottom-[5px] after:h-[3px] after:rounded-full after:bg-accent'
                : 'before:absolute before:inset-x-2 before:-top-[5px] before:h-[3px] before:rounded-full before:bg-accent'),
          )}
        >
          {canReorder && (
            <button
              type="button"
              aria-label={`Reorder ${f.name} — use arrow keys`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  nudge(f.id, -1);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  nudge(f.id, 1);
                }
              }}
              className="flex-none cursor-grab text-faint active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </button>
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-ink">{f.name}</span>
            <span className="text-[11.5px] text-muted tabular-nums">{formatBytes(f.size)}</span>
          </span>

          {!disabled && (
            <button
              type="button"
              aria-label={`Remove ${f.name}`}
              onClick={() => onRemove(f.id)}
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] border border-line text-muted hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
