import type { OptionsProps } from '@/tools/registry';
import { Field, RadioRow, TextField } from '@/tools/options/fields';
import { cn } from '@/ui/cn';

const MODES = [
  { value: 'everyN', label: 'Fixed size', hint: 'Every N pages → one file' },
  { value: 'ranges', label: 'Custom ranges', hint: 'One file per range you list' },
  { value: 'pages', label: 'Individual pages', hint: 'One file per page' },
] as const;

const SIZE_PRESETS = [1, 2, 5, 10, 20];

export function SplitOptions({ value, onChange }: OptionsProps) {
  const mode = String(value['mode'] ?? 'everyN');
  const n = Number(value['n'] ?? 1);

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Split by">
        <RadioRow
          name="Split by"
          options={MODES}
          value={mode as 'everyN' | 'pages' | 'ranges'}
          onChange={(m) => onChange({ ...value, mode: m })}
        />
      </Field>

      {mode === 'everyN' && (
        <Field label="Pages per file">
          <div className="flex flex-wrap items-center gap-1.5">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ ...value, n: p })}
                className={cn(
                  'h-8 min-w-9 rounded-lg border px-2 text-[12.5px] font-medium',
                  n === p
                    ? 'border-accent bg-accent-wash text-accent'
                    : 'border-line bg-surface text-ink',
                )}
              >
                {p}
              </button>
            ))}
            <span className="mx-1 text-[11.5px] text-faint">or</span>
            <input
              type="number"
              min={1}
              aria-label="Pages per file"
              value={n}
              onChange={(e) =>
                onChange({ ...value, n: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
              }
              className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink outline-none focus-visible:border-accent"
            />
          </div>
        </Field>
      )}

      {mode === 'ranges' && (
        <Field
          label="Ranges"
          hint={
            <>
              One file per range. Comma-separated. Open end = to last page.
              <br />
              e.g. <code className="text-muted">1-3, 4-5, 6-</code> → three files.
            </>
          }
        >
          <TextField
            ariaLabel="Ranges"
            value={String(value['ranges'] ?? '')}
            placeholder="1-3, 4-5, 6-"
            onChange={(ranges) => onChange({ ...value, ranges })}
          />
        </Field>
      )}
    </div>
  );
}
