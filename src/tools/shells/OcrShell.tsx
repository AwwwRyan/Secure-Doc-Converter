import { useRef, useState } from 'react';
import { ScanText } from 'lucide-react';
import type { ToolDef } from '@/lib/tools/types';
import { useSession } from '@/lib/store/session';
import { runOcr, type OcrFormat } from '@/lib/ocr/runOcr';
import { ToolHeader } from '@/components/ToolHeader';
import { FileDropzone } from '@/components/FileDropzone';
import { ResultCard } from '@/components/ResultCard';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Field, RadioRow, RANGE_HINT, SelectField, TextField } from '@/tools/options/fields';
import { Button } from '@/ui/Button';

const FORMATS = [
  { value: 'pdf', label: 'Searchable PDF', hint: 'Original pages + an invisible text layer' },
  { value: 'txt', label: 'Plain text (.txt)', hint: 'Just the recognised text' },
] as const;

const QUALITY = [
  { value: '2', label: 'Standard (faster)' },
  { value: '3', label: 'High (sharper, slower)' },
] as const;

export function OcrShell({ tool }: { tool: ToolDef }) {
  const files = useSession((s) => s.files);
  const addFiles = useSession((s) => s.addFiles);
  const removeFile = useSession((s) => s.removeFile);
  const status = useSession((s) => s.status);
  const progress = useSession((s) => s.progress);
  const error = useSession((s) => s.error);
  const result = useSession((s) => s.result);
  const setStatus = useSession((s) => s.setStatus);
  const setProgress = useSession((s) => s.setProgress);
  const setError = useSession((s) => s.setError);
  const setResult = useSession((s) => s.setResult);
  const reset = useSession((s) => s.reset);

  const first = files[0];
  const [format, setFormat] = useState<OcrFormat>('pdf');
  const [scale, setScale] = useState('2');
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const busy = status === 'preparing' || status === 'running';
  const done = status === 'done';

  async function start() {
    if (!first) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus('running');
    setProgress(0);
    setPhase('Preparing…');
    try {
      const r = await runOcr(first.file, {
        format,
        scale: Number(scale),
        range,
        signal: ac.signal,
        onProgress: (d, t, ph) => {
          setProgress(t > 0 ? d / t : 0);
          setPhase(t > 0 ? `${ph} — ${d} / ${t}` : ph);
        },
      });
      setResult([
        {
          name: r.name,
          bytes: r.bytes,
          url: URL.createObjectURL(new Blob([r.bytes], { type: r.mime })),
          note: r.note,
        },
      ]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') reset();
      else setError(err instanceof Error ? err.message : 'OCR failed.');
    } finally {
      abortRef.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ToolHeader name={tool.name} blurb={tool.blurb} />

      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-[12px] text-muted">
        <ScanText size={15} className="mt-0.5 flex-none text-faint" />
        The OCR engine (~9 MB) downloads the first time you run it, then works a few seconds per
        page. English only for now.
      </div>

      {!first ? (
        <FileDropzone multiple={false} hasFiles={false} onFiles={(f) => f[0] && addFiles([f[0]])} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-sm">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                {first.name}
              </span>
              {!busy && (
                <button
                  type="button"
                  onClick={() => removeFile(first.id)}
                  className="text-[12px] text-muted hover:text-ink"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <Field label="Output">
                <RadioRow name="Output" options={FORMATS} value={format} onChange={setFormat} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quality">
                  <SelectField
                    ariaLabel="Quality"
                    value={scale}
                    options={QUALITY}
                    onChange={setScale}
                  />
                </Field>
                <Field label="Pages" hint={RANGE_HINT}>
                  <TextField
                    ariaLabel="Pages"
                    value={range}
                    placeholder="all pages"
                    onChange={setRange}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:sticky lg:top-4">
            {error && (
              <div className="rounded-[var(--radius-ctl)] border border-line bg-surface p-3 text-[12.5px] text-ink">
                {error}
              </div>
            )}

            {done && result && <ResultCard result={result} onStartOver={reset} />}

            {busy && (
              <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between text-[13px] font-semibold text-ink">
                  <span>Recognising text…</span>
                  <span className="tabular-nums text-muted">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                  />
                </div>
                <span className="text-[11.5px] text-muted">{phase}</span>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!busy && !done && (
              <Button size="lg" className="w-full" onClick={() => void start()}>
                Run OCR
              </Button>
            )}

            <PrivacyBadge tier={tool.tier} />
          </div>
        </div>
      )}
    </div>
  );
}
