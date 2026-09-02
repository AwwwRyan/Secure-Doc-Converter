import { Download, FileDown, Package, RotateCcw } from 'lucide-react';
import type { ResultFile } from '@/lib/store/session';
import { zipFiles } from '@/lib/zip';
import { Button } from '@/ui/Button';
import { buttonVariants } from '@/ui/button-variants';
import { cn } from '@/ui/cn';

function triggerDownload(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ResultCard({
  result,
  onStartOver,
}: {
  result: ResultFile[];
  onStartOver: () => void;
}) {
  const multi = result.length > 1;

  function downloadEach() {
    // Browsers may prompt once to allow multiple downloads; stagger slightly.
    result.forEach((f, i) => setTimeout(() => triggerDownload(f.url, f.name), i * 250));
  }

  function downloadZip() {
    const bytes = zipFiles(result.map((f) => ({ name: f.name, bytes: f.bytes })));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    triggerDownload(url, 'files.zip');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <span className="text-[11px] font-bold tracking-[0.08em] text-good-ink uppercase">
        {multi ? `${result.length} files ready` : 'Result'}
      </span>

      {multi ? (
        <>
          <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
            {result.map((f) => (
              <li key={f.name}>
                <a
                  href={f.url}
                  download={f.name}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-ink hover:bg-bg"
                >
                  <FileDown size={13} className="flex-none text-faint" />
                  <span className="truncate">{f.name}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <Button onClick={downloadEach}>
              <Download size={15} /> Download all separately
            </Button>
            <Button variant="ghost" onClick={downloadZip}>
              <Package size={15} /> Download as .zip
            </Button>
          </div>
        </>
      ) : (
        <>
          <span className="truncate text-[12.5px] text-muted">{result[0]!.name}</span>
          {result[0]!.note && (
            <span className="text-[12px] font-medium text-good-ink">{result[0]!.note}</span>
          )}
          <a
            href={result[0]!.url}
            download={result[0]!.name}
            className={cn(buttonVariants({ size: 'md' }))}
          >
            <Download size={15} /> Download
          </a>
        </>
      )}

      <Button variant="ghost" size="sm" onClick={onStartOver}>
        <RotateCcw size={13} /> Start over
      </Button>
    </div>
  );
}
