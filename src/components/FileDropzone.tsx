import { useState } from 'react';
import type { DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/ui/cn';

export function FileDropzone({
  multiple,
  hasFiles,
  disabled,
  onFiles,
  compact,
}: {
  multiple: boolean;
  hasFiles: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-center text-[12.5px] text-faint transition-colors',
        compact ? 'px-6 py-8' : 'px-6 py-12',
        dragging && 'border-accent bg-accent-wash text-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <Upload size={18} strokeWidth={1.6} />
      {hasFiles ? 'Add another PDF, or browse' : 'Drop a PDF here, or browse'}
      <input
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </label>
  );
}
