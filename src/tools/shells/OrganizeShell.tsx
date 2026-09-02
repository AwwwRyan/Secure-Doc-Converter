import { useState } from 'react';
import type { DragEvent } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Upload } from 'lucide-react';
import type { ToolDef } from '@/lib/tools/types';
import { useSession } from '@/lib/store/session';
import { useToolRun } from '@/lib/hooks/useToolRun';
import { usePdfThumbs } from '@/lib/hooks/usePdfThumbs';
import { usePageModel } from '@/lib/hooks/usePageModel';
import { PageGrid } from '@/components/pagegrid/PageGrid';
import { ResultCard } from '@/components/ResultCard';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';

export function OrganizeShell({ tool }: { tool: ToolDef }) {
  const files = useSession((s) => s.files);
  const first = files[0];

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
        <p className="text-[13px] text-muted">{tool.blurb}. Runs entirely in your browser.</p>
      </div>

      {first ? <Loaded key={`${first.id}`} tool={tool} file={first.file} /> : <Dropzone />}
    </div>
  );
}

function Dropzone() {
  const addFiles = useSession((s) => s.addFiles);
  const [dragging, setDragging] = useState(false);
  function accept(list: FileList | File[]) {
    const f = Array.from(list)[0];
    if (f) addFiles([f]);
  }
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
        accept(e.dataTransfer.files);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-12 text-center text-[12.5px] text-faint transition-colors',
        dragging && 'border-accent bg-accent-wash text-accent',
      )}
    >
      <Upload size={18} strokeWidth={1.6} />
      Drop a PDF here, or browse
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) accept(e.target.files);
          e.target.value = '';
        }}
      />
    </label>
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
