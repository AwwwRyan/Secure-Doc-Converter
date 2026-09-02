import { useEffect, useState } from 'react';
import { FileWarning, Sparkles } from 'lucide-react';
import type { ToolDef } from '@/lib/tools/types';
import { useSession } from '@/lib/store/session';
import { officeToPdf, type OfficeKind } from '@/lib/convert/officeToPdf';
import { libreOfficeConvert, libreOfficeStatus } from '@/lib/convert/libreoffice';
import { ToolHeader } from '@/components/ToolHeader';
import { FileDropzone } from '@/components/FileDropzone';
import { ResultCard } from '@/components/ResultCard';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Field, SelectField, NumberField } from '@/tools/options/fields';
import { Button } from '@/ui/Button';

const SIZES = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
] as const;

const ACCEPT =
  '.docx,.xlsx,.pptx,.docm,.xlsm,.pptm,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const OUT_NAME: Record<OfficeKind, string> = {
  word: 'document.pdf',
  excel: 'workbook.pdf',
  powerpoint: 'slides.pdf',
};

export function OfficeShell({ tool }: { tool: ToolDef }) {
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
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [margin, setMargin] = useState(36);
  const [phase, setPhase] = useState('');
  // Tier 2 (LibreOffice-WASM) is hidden unless the engine is vendored and the
  // tab is cross-origin isolated — see ADR-012. Dormant on current deployments.
  const [hifi, setHifi] = useState(false);
  const [useHifi, setUseHifi] = useState(false);

  useEffect(() => {
    let live = true;
    void libreOfficeStatus().then((s) => live && s.ok && setHifi(true));
    return () => {
      live = false;
    };
  }, []);

  const busy = status === 'preparing' || status === 'running';
  const done = status === 'done';

  async function start() {
    if (!first) return;
    setStatus('running');
    setProgress(0);
    setPhase(useHifi ? 'Starting LibreOffice…' : 'Loading converter…');
    try {
      if (useHifi) {
        const bytes = await libreOfficeConvert(first.file);
        const kind =
          (['docx', 'docm'].some((e) => first.name.toLowerCase().endsWith(e)) && 'word') ||
          (['xlsx', 'xlsm'].some((e) => first.name.toLowerCase().endsWith(e)) && 'excel') ||
          'powerpoint';
        setResult([
          {
            name: OUT_NAME[kind as OfficeKind],
            bytes,
            url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })),
            note: 'Rendered by LibreOffice.',
          },
        ]);
        return;
      }
      const { bytes, kind } = await officeToPdf(first.file, { pageSize, margin }, (frac, label) => {
        setProgress(frac);
        if (label) setPhase(label);
      });
      setResult([
        {
          name: OUT_NAME[kind],
          bytes,
          url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })),
          note: 'Approximate layout — check it before sharing.',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ToolHeader name={tool.name} blurb={tool.blurb} />

      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-[12px] text-muted">
        <FileWarning size={15} className="mt-0.5 flex-none text-faint" />
        <span>
          This is a quick, private approximation — fonts, spacing and complex layouts won&rsquo;t
          match the source app exactly. The converter for your file type (Word, Excel or PowerPoint)
          downloads the first time you use it. Opens <code>.docx</code>, <code>.xlsx</code> and{' '}
          <code>.pptx</code>.
        </span>
      </div>

      {!first ? (
        <FileDropzone
          multiple={false}
          hasFiles={false}
          onFiles={(f) => f[0] && addFiles([f[0]])}
          accept={ACCEPT}
          noun="Office file"
        />
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Page size">
                  <SelectField
                    ariaLabel="Page size"
                    value={pageSize}
                    options={SIZES}
                    onChange={setPageSize}
                  />
                </Field>
                <Field label="Margin">
                  <NumberField
                    ariaLabel="Margin"
                    value={margin}
                    min={0}
                    max={120}
                    suffix="pt"
                    onChange={setMargin}
                  />
                </Field>
              </div>
              <span className="text-[11.5px] text-muted">
                Spreadsheets and slides are placed landscape automatically.
              </span>
            </div>

            {hifi && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-surface p-4 text-[12.5px] shadow-sm">
                <input
                  type="checkbox"
                  checked={useHifi}
                  disabled={busy}
                  onChange={(e) => setUseHifi(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold text-ink">
                    <Sparkles size={13} className="text-accent" /> High-fidelity conversion
                  </span>
                  <span className="text-muted">
                    Renders with LibreOffice for an exact match. Downloads a ~221&nbsp;MB engine the
                    first time, then stays cached. Page size and margin come from the document.
                  </span>
                </span>
              </label>
            )}
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
                  <span>Converting…</span>
                  <span className="tabular-nums text-muted">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                  />
                </div>
                <span className="text-[11.5px] text-muted">{phase}</span>
              </div>
            )}

            {!busy && !done && (
              <Button size="lg" className="w-full" onClick={() => void start()}>
                Convert to PDF
              </Button>
            )}

            <PrivacyBadge tier={tool.tier} note={tool.note} />
          </div>
        </div>
      )}
    </div>
  );
}
