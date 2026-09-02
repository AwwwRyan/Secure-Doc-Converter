import { useSession } from '@/lib/store/session';
import { useToolRun } from '@/lib/hooks/useToolRun';
import { usePdfThumbs } from '@/lib/hooks/usePdfThumbs';
import { usePageModel } from '@/lib/hooks/usePageModel';
import type { ToolDef } from '@/lib/tools/types';
import { PageGrid } from '@/components/pagegrid/PageGrid';
import { ResultCard } from '@/components/ResultCard';
import { ToolHeader } from '@/components/ToolHeader';
import { FileDropzone } from '@/components/FileDropzone';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Button } from '@/ui/Button';

export function OrganizeShell({ tool }: { tool: ToolDef }) {
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
  const { thumbnailer, pageCount, loading, error } = usePdfThumbs(file);
  const removeFile = useSession((s) => s.removeFile);
  const files = useSession((s) => s.files);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-[var(--radius-ctl)] border border-line bg-surface p-3 text-[12.5px] text-ink">
          {error}
        </div>
        <Button variant="ghost" size="sm" onClick={() => files[0] && removeFile(files[0].id)}>
          Choose a different file
        </Button>
      </div>
    );
  }
  if (loading || !thumbnailer || pageCount === 0) {
    return <p className="text-[13px] text-muted">Reading pages…</p>;
  }
  return <Editor key={pageCount} tool={tool} thumbnailer={thumbnailer} pageCount={pageCount} />;
}

function Editor({
  tool,
  thumbnailer,
  pageCount,
}: {
  tool: ToolDef;
  thumbnailer: NonNullable<ReturnType<typeof usePdfThumbs>['thumbnailer']>;
  pageCount: number;
}) {
  const model = usePageModel(pageCount);
  const { run, cancel } = useToolRun('organize');
  const status = useSession((s) => s.status);
  const progress = useSession((s) => s.progress);
  const error = useSession((s) => s.error);
  const result = useSession((s) => s.result);

  const busy = status === 'preparing' || status === 'running';
  const done = status === 'done';

  function apply() {
    void run({
      op: 'arrange',
      spec: model.items.map((it) => ({ page: it.srcPage, rotate: it.rotate })),
    });
  }

  if (done && result) {
    return (
      <div className="max-w-[360px]">
        <ResultCard result={result} onStartOver={cancel} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageGrid model={model} thumbnailer={thumbnailer} />

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
          ) : (
            <Button size="lg" disabled={model.items.length === 0} onClick={apply}>
              Apply changes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
