import { useState } from 'react';
import type { DragEvent } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Download, RotateCcw, Upload, X } from 'lucide-react';
import type { ToolDef } from '@/lib/tools/types';
import { useSession } from '@/lib/store/session';
import { useToolRun } from '@/lib/hooks/useToolRun';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ToolShell({ tool }: { tool: ToolDef }) {
  const { files, status, progress, error, resultUrl, resultName } = useSession();
  const { run, cancel, addFiles, removeFile, reset } = useToolRun(tool.id);
  const [dragging, setDragging] = useState(false);

  const busy = status === 'preparing' || status === 'running';
  const done = status === 'done';

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    addFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          <ChevronLeft size={13} /> All tools
        </Link>
        <h1 className="text-[21px] font-bold tracking-tight text-ink">{tool.name}</h1>
        <p className="text-[13px] text-muted">{tool.blurb}.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* Zone 1 + 2 */}
        <div className="flex flex-col gap-4">
          <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
            Files
          </span>

          {files.length > 0 && (
            <ul className="flex flex-col gap-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {f.name}
                    </span>
                    <span className="text-[11.5px] text-muted tabular-nums">
                      {formatBytes(f.size)}
                    </span>
                  </span>
                  {!busy && (
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => removeFile(f.id)}
                      className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] border border-line text-muted hover:text-ink"
                    >
                      <X size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-8 text-center text-[12.5px] text-faint transition-colors',
              dragging && 'border-accent bg-accent-wash text-accent',
              busy && 'pointer-events-none opacity-50',
            )}
          >
            <Upload size={18} strokeWidth={1.6} />
            {files.length > 0 ? 'Add another file, or browse' : 'Drop files here, or browse'}
            <input
              type="file"
              multiple
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </label>

          <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
            Options
          </span>
          <div className="rounded-2xl border border-line bg-surface p-4 text-[12.5px] text-muted shadow-sm">
            Tool options land with the tool itself (M1&ndash;M5). This shell wires up files,
            progress, results, and cleanup.
          </div>
        </div>

        {/* Zone 3 */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          {error && (
            <div className="rounded-[var(--radius-ctl)] border border-line bg-surface p-3 text-[12.5px] text-ink">
              {error}
            </div>
          )}

          {done && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <span className="text-[11px] font-bold tracking-[0.08em] text-good-ink uppercase">
                Result
              </span>
              <span className="truncate text-[12.5px] text-muted">{resultName}</span>
              <Button
                disabled={!resultUrl}
                onClick={() => {
                  if (!resultUrl) return;
                  const a = document.createElement('a');
                  a.href = resultUrl;
                  a.download = resultName ?? 'result.pdf';
                  a.click();
                }}
              >
                <Download size={15} /> Download
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw size={13} /> Start over
              </Button>
              <p className="text-[11px] text-faint">
                Demo shell: the result is an empty placeholder PDF.
              </p>
            </div>
          )}

          {!done && (
            <>
              {busy ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between text-[13px] font-semibold text-ink">
                    <span>{status === 'preparing' ? 'Preparing…' : 'Working…'}</span>
                    <span className="tabular-nums text-muted">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={cancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={files.length === 0}
                  onClick={() => void run()}
                >
                  Run {tool.name}
                </Button>
              )}
              <PrivacyBadge tier={tool.tier} note={tool.note} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
