import { useState } from 'react';
import { Download, RotateCcw, X } from 'lucide-react';
import type { ToolDef } from '@/lib/tools/types';
import { getToolConfig } from '@/tools/registry';
import { useSession } from '@/lib/store/session';
import { useToolRun } from '@/lib/hooks/useToolRun';
import { usePreview } from '@/lib/hooks/usePreview';
import { ToolHeader } from '@/components/ToolHeader';
import { FileDropzone } from '@/components/FileDropzone';
import { PagePreview } from '@/components/PagePreview';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Button } from '@/ui/Button';
import { buttonVariants } from '@/ui/button-variants';
import { cn } from '@/ui/cn';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function EditShell({ tool }: { tool: ToolDef }) {
  const files = useSession((s) => s.files);
  const addFiles = useSession((s) => s.addFiles);
  const first = files[0];

  return (
    <div className="flex flex-col gap-5">
      <ToolHeader name={tool.name} blurb={tool.blurb} />
      {first ? (
        <Loaded key={first.id} tool={tool} file={first.file} />
      ) : (
        <FileDropzone multiple={false} hasFiles={false} onFiles={(f) => f[0] && addFiles([f[0]])} />
      )}
    </div>
  );
}

function Loaded({ tool, file }: { tool: ToolDef; file: File }) {
  const config = getToolConfig(tool.id);
  const removeFile = useSession((s) => s.removeFile);
  const fileId = useSession((s) => s.files[0]?.id);
  const status = useSession((s) => s.status);
  const progress = useSession((s) => s.progress);
  const error = useSession((s) => s.error);
  const result = useSession((s) => s.result);

  const [options, setOptions] = useState<Record<string, unknown>>(config?.defaultOptions ?? {});
  const { run, cancel } = useToolRun(config?.workerId ?? 'edit');
  const { url: previewUrl, busy: previewing } = usePreview(
    config?.workerId ?? 'edit',
    file,
    options,
  );

  if (!config?.Options) return null;
  const Options = config.Options;
  const busy = status === 'preparing' || status === 'running';
  const done = status === 'done';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{file.name}</span>
              <span className="text-[11.5px] text-muted tabular-nums">
                {formatBytes(file.size)}
              </span>
            </span>
            {!busy && (
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => fileId && removeFile(fileId)}
                className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] border border-line text-muted hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <Options value={options} onChange={setOptions} />
          </div>
        </div>

        <div className="lg:sticky lg:top-4">
          <PagePreview url={previewUrl} busy={previewing} />
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg py-3">
        <PrivacyBadge tier={tool.tier} />
        <div className="flex items-center gap-2">
          {error && <span className="text-[12px] text-[#B4231F]">{error}</span>}
          {busy ? (
            <>
              <span className="text-[12px] text-muted tabular-nums">
                {Math.round(progress * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={cancel}>
                Cancel
              </Button>
            </>
          ) : done && result ? (
            <>
              <a
                href={result[0]!.url}
                download={result[0]!.name}
                className={cn(buttonVariants({ size: 'md' }))}
              >
                <Download size={15} /> Download
              </a>
              <Button variant="ghost" size="sm" onClick={cancel}>
                <RotateCcw size={13} /> Start over
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={() => void run(options)}>
              {config.action}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
