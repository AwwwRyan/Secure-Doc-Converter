import { useState } from 'react';
import type { DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { asMB, checkFileSizes, MAX_FILE_BYTES } from '@/lib/limits';
import { cn } from '@/ui/cn';

export function FileDropzone({
  multiple,
  hasFiles,
  disabled,
  onFiles,
  compact,
  accept = 'application/pdf,.pdf',
  noun = 'PDF',
}: {
  multiple: boolean;
  hasFiles: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
  accept?: string;
  noun?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function take(list: File[]) {
    const { ok, tooBig, heavy } = checkFileSizes(list);
    if (tooBig.length) {
      const names = tooBig.map((f) => `${f.name} (${asMB(f.size)})`).join(', ');
      setNotice(
        `Too large: ${names}. The limit is ${asMB(MAX_FILE_BYTES)} — everything runs in your ` +
          `browser's memory, so bigger files can crash the tab.`,
      );
    } else if (heavy) {
      setNotice(`Large file — this runs entirely in memory. It may be slow or fail on a phone.`);
    } else {
      setNotice(null);
    }
    if (ok.length) onFiles(ok);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) take(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-center text-[12.5px] text-faint transition-colors',
          compact ? 'px-6 py-8' : 'px-6 py-12',
          dragging && 'border-accent bg-accent-wash text-accent',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <Upload size={18} strokeWidth={1.6} />
        {hasFiles
          ? `Add another ${noun}, or browse`
          : `Drop ${noun === 'PDF' ? 'a PDF' : noun} here, or browse`}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) take(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
      </label>
      {notice && <p className="text-[12px] text-ink">{notice}</p>}
    </div>
  );
}
