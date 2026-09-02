import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import type { PageItem } from '@/lib/hooks/usePageModel';
import type { Thumbnailer } from '@/lib/pdf/thumbs';
import { cn } from '@/ui/cn';

interface Props {
  item: PageItem;
  position: number; // 1-based position in the current order
  selected: boolean;
  dropBefore: boolean;
  thumbnailer: Thumbnailer;
  onSelect: (e: ReactMouseEvent) => void;
  onRotate: (delta: 90 | -90) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOverHalf: (before: boolean) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

export function PageThumb({
  item,
  position,
  selected,
  dropBefore,
  thumbnailer,
  onSelect,
  onRotate,
  onDelete,
  onDragStart,
  onDragOverHalf,
  onDrop,
  onDragEnd,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const sideways = item.rotate === 90 || item.rotate === 270;

  useEffect(() => {
    const el = ref.current;
    if (!el || url) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        thumbnailer
          .render(item.srcPage)
          .then((t) => !cancelled && setUrl(t.url))
          .catch(() => !cancelled && setFailed(true));
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [thumbnailer, item.srcPage, url]);

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {dropBefore && (
        <span className="absolute -left-2 top-0 bottom-6 w-[3px] rounded-full bg-accent" />
      )}
      <div
        ref={ref}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          onDragOverHalf(e.clientX < r.left + r.width / 2);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        className={cn(
          'group relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm',
          selected ? 'border-accent ring-2 ring-accent' : 'border-line',
        )}
      >
        {url ? (
          <img
            src={url}
            alt={`Page ${item.srcPage}`}
            draggable={false}
            className="h-full w-full object-contain transition-transform"
            style={{ transform: `rotate(${item.rotate}deg) scale(${sideways ? 0.75 : 1})` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-faint">
            {failed ? 'preview failed' : '…'}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-1 bg-black/40 p-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <IconBtn label="Rotate left" onClick={() => onRotate(-90)}>
            <RotateCcw size={13} />
          </IconBtn>
          <IconBtn label="Rotate right" onClick={() => onRotate(90)}>
            <RotateCw size={13} />
          </IconBtn>
          <IconBtn label="Delete page" danger onClick={onDelete}>
            <Trash2 size={13} />
          </IconBtn>
        </div>
      </div>
      <span
        className={cn(
          'rounded-full border px-2 py-px text-[10.5px] font-semibold tabular-nums',
          selected ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-muted',
        )}
      >
        {position}
      </span>
    </div>
  );
}

function IconBtn({
  children,
  label,
  danger,
  onClick,
}: {
  children: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-ink hover:bg-white',
        danger && 'text-[#B4231F]',
      )}
    >
      {children}
    </button>
  );
}
