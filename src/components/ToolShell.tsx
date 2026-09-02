import { useState } from 'react';
import type { ToolDef } from '@/lib/tools/types';
import type { ToolConfig } from '@/tools/registry';
import { useSession } from '@/lib/store/session';
import { useToolRun } from '@/lib/hooks/useToolRun';
import { FileList } from '@/components/FileList';
import { FileDropzone } from '@/components/FileDropzone';
import { ResultCard } from '@/components/ResultCard';
import { ToolHeader } from '@/components/ToolHeader';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Button } from '@/ui/Button';

export function ToolShell({ tool, config }: { tool: ToolDef; config: ToolConfig }) {
  const files = useSession((s) => s.files);
  const status = useSession((s) => s.status);
  const progress = useSession((s) => s.progress);
  const error = useSession((s) => s.error);
  const result = useSession((s) => s.result);
  const addFiles = useSession((s) => s.addFiles);
  const removeFile = useSession((s) => s.removeFile);
  const moveFileTo = useSession((s) => s.moveFileTo);

  const { run, cancel } = useToolRun(config.workerId);
  const [options, setOptions] = useState<Record<string, unknown>>(config.defaultOptions);

  const busy = status === 'preparing' || status === 'running';
  const done = status === 'done';
  const Options = config.Options;

  function accept(list: File[]) {
    addFiles(config.multiple ? list : list.slice(0, 1));
  }

  return (
    <div className="flex flex-col gap-5">
      <ToolHeader name={tool.name} blurb={tool.blurb} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
            {config.multiple ? 'Files' : 'File'}
          </span>

          {files.length > 0 && (
            <FileList
              files={files}
              reorderable={config.multiple}
              disabled={busy}
              onRemove={removeFile}
              onMoveTo={moveFileTo}
            />
          )}

          {(config.multiple || files.length === 0) && (
            <FileDropzone
              multiple={config.multiple}
              hasFiles={files.length > 0}
              disabled={busy}
              onFiles={accept}
              compact
            />
          )}

          {Options && (
            <>
              <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
                Options
              </span>
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                <Options value={options} onChange={setOptions} />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          {error && (
            <div className="rounded-[var(--radius-ctl)] border border-line bg-surface p-3 text-[12.5px] text-ink">
              {error}
            </div>
          )}

          {done && result && <ResultCard result={result} onStartOver={cancel} />}

          {busy && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between text-[13px] font-semibold text-ink">
                <span>{status === 'preparing' ? 'Preparing…' : 'Working…'}</span>
                <span className="tabular-nums text-muted">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!busy && !done && (
            <Button
              size="lg"
              className="w-full"
              disabled={files.length === 0}
              onClick={() => void run(options)}
            >
              {config.action}
            </Button>
          )}

          <PrivacyBadge tier={tool.tier} note={tool.note} />
        </div>
      </div>
    </div>
  );
}
