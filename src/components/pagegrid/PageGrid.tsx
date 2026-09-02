import { useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import { RotateCcw, RotateCw, Trash2, Undo2 } from 'lucide-react';
import type { usePageModel } from '@/lib/hooks/usePageModel';
import type { Thumbnailer } from '@/lib/pdf/thumbs';
import { PageThumb } from '@/components/pagegrid/PageThumb';

type Model = ReturnType<typeof usePageModel>;

export function PageGrid({ model, thumbnailer }: { model: Model; thumbnailer: Thumbnailer }) {
  const { items, selected } = model;
  const dragIndex = useRef<number | null>(null);
  const [drop, setDrop] = useState<{ index: number; before: boolean } | null>(null);

  function commitDrop() {
    const from = dragIndex.current;
    if (from === null || !drop) return;
    let to = drop.before ? drop.index : drop.index + 1;
    if (from < to) to -= 1;
    model.move(from, to);
    dragIndex.current = null;
    setDrop(null);
  }

  function onThumbClick(e: ReactMouseEvent, id: string) {
    if (e.shiftKey) model.selectRangeTo(id);
    else if (e.metaKey || e.ctrlKey) model.toggle(id);
    else model.selectOnly(id);
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      model.selectAll();
    } else if (e.key === 'Escape') {
      model.clearSelection();
    } else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      model.moveSelected(-1);
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      model.moveSelected(1);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size) {
      e.preventDefault();
      model.remove(selected);
    } else if (e.key === '[' && selected.size) {
      model.rotate(selected, -90);
    } else if (e.key === ']' && selected.size) {
      model.rotate(selected, 90);
    }
  }

  const targets = selected.size ? selected : new Set(items.map((it) => it.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <span className="text-[12.5px] text-muted tabular-nums">
          <b className="font-semibold text-ink">{items.length} pages</b>
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
        <div className="flex items-center gap-1.5">
          <Toolbtn
            onClick={() => model.rotate(targets, -90)}
            icon={<RotateCcw size={13} />}
            label="Rotate left"
          />
          <Toolbtn
            onClick={() => model.rotate(targets, 90)}
            icon={<RotateCw size={13} />}
            label="Rotate right"
          />
          <Toolbtn
            onClick={() => model.remove(targets)}
            icon={<Trash2 size={13} />}
            label={selected.size ? 'Delete selected' : 'Delete all'}
            danger
            disabled={selected.size === 0}
          />
          {model.dirty && (
            <Toolbtn onClick={model.reset} icon={<Undo2 size={13} />} label="Reset" />
          )}
        </div>
      </div>

      <div
        role="listbox"
        aria-label="Pages"
        aria-multiselectable="true"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onDragLeave={() => setDrop(null)}
        className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-x-5 gap-y-4 rounded-xl border border-line bg-bg p-4 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {items.map((item, i) => (
          <PageThumb
            key={item.id}
            item={item}
            position={i + 1}
            selected={selected.has(item.id)}
            dropBefore={drop?.index === i && drop.before}
            thumbnailer={thumbnailer}
            onSelect={(e) => onThumbClick(e, item.id)}
            onRotate={(delta) => model.rotate([item.id], delta)}
            onDelete={() => model.remove([item.id])}
            onDragStart={() => {
              dragIndex.current = i;
            }}
            onDragOverHalf={(before) => setDrop({ index: i, before })}
            onDrop={commitDrop}
            onDragEnd={() => {
              dragIndex.current = null;
              setDrop(null);
            }}
          />
        ))}
      </div>

      <p className="text-[11px] text-faint">
        Click to select · Shift-click for a range · drag to reorder · with pages selected, Alt + ↑/↓
        moves them, [ ] rotates, Delete removes.
      </p>
    </div>
  );
}

function Toolbtn({
  onClick,
  icon,
  label,
  danger,
  disabled,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12px] font-medium text-ink hover:bg-bg disabled:opacity-40 ' +
        (danger ? 'text-[#B4231F]' : '')
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
