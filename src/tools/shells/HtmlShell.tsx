import { useState } from 'react';
import { Download, FileCode, RotateCcw } from 'lucide-react';
import type { ToolDef } from '@/lib/tools/types';
import { useSession } from '@/lib/store/session';
import { htmlToPdf } from '@/lib/convert/htmlToPdf';
import { ToolHeader } from '@/components/ToolHeader';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { Field, SelectField, NumberField } from '@/tools/options/fields';
import { Button } from '@/ui/Button';
import { buttonVariants } from '@/ui/button-variants';
import { cn } from '@/ui/cn';

const SIZES = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
] as const;

export function HtmlShell({ tool }: { tool: ToolDef }) {
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const result = useSession((s) => s.result);
  const setStatus = useSession((s) => s.setStatus);
  const setError = useSession((s) => s.setError);
  const setResult = useSession((s) => s.setResult);
  const reset = useSession((s) => s.reset);

  const [html, setHtml] = useState('');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [margin, setMargin] = useState(36);

  const busy = status === 'preparing' || status === 'running';
  const done = status === 'done';

  async function loadFile(file: File | undefined) {
    if (file) setHtml(await file.text());
  }

  async function convert() {
    setStatus('running');
    setError('');
    try {
      const bytes = await htmlToPdf({ html, pageSize, margin });
      setResult([
        {
          name: 'page.pdf',
          bytes,
          url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })),
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
        <FileCode size={15} className="mt-0.5 flex-none text-faint" />
        Only self-contained HTML converts — external stylesheets, scripts and images are ignored for
        safety. Inline styles and <code>data:</code> images are fine.
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
              HTML
            </span>
            <label className="cursor-pointer text-[12px] text-accent hover:underline">
              upload a .html file
              <input
                type="file"
                accept="text/html,.html,.htm"
                className="sr-only"
                onChange={(e) => void loadFile(e.target.files?.[0])}
              />
            </label>
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder={'<h1>Hello</h1>\n<p>Paste or type self-contained HTML…</p>'}
            spellCheck={false}
            className="min-h-[320px] rounded-2xl border border-line bg-surface p-4 font-mono text-[12.5px] text-ink outline-none focus-visible:border-accent"
          />
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
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

          {error && (
            <div className="rounded-[var(--radius-ctl)] border border-line bg-surface p-3 text-[12.5px] text-ink">
              {error}
            </div>
          )}

          {done && result ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <span className="text-[11px] font-bold tracking-[0.08em] text-good-ink uppercase">
                Result
              </span>
              <a
                href={result[0]!.url}
                download={result[0]!.name}
                className={cn(buttonVariants({ size: 'md' }))}
              >
                <Download size={15} /> Download
              </a>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw size={13} /> Start over
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={busy || !html.trim()}
              onClick={() => void convert()}
            >
              {busy ? 'Converting…' : 'Convert to PDF'}
            </Button>
          )}

          <PrivacyBadge tier={tool.tier} />
        </div>
      </div>
    </div>
  );
}
