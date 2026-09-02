import type { OptionsProps } from '@/tools/registry';
import { Field, RadioRow, TextField } from '@/tools/options/fields';

const MODES = [
  { value: 'everyN', label: 'Every N pages', hint: 'Fixed-size chunks' },
  { value: 'pages', label: 'One file per page' },
  { value: 'ranges', label: 'Custom ranges', hint: 'One file per range' },
] as const;

export function SplitOptions({ value, onChange }: OptionsProps) {
  const mode = String(value['mode'] ?? 'everyN');
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
          <TextField
            ariaLabel="Pages per file"
            value={String(value['n'] ?? '1')}
            placeholder="1"
            onChange={(n) => onChange({ ...value, n: Math.max(1, Number.parseInt(n, 10) || 1) })}
          />
        </Field>
      )}

      {mode === 'ranges' && (
        <Field label="Ranges" hint="One per line or separated by ;  — e.g. 1-3 ; 4-8 ; 9-">
          <textarea
            aria-label="Ranges"
            rows={3}
            value={String(value['ranges'] ?? '')}
            placeholder={'1-3\n4-8\n9-'}
            onChange={(e) => onChange({ ...value, ranges: e.target.value })}
            className="rounded-[var(--radius-ctl)] border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none placeholder:text-faint focus-visible:border-accent"
          />
        </Field>
      )}
    </div>
  );
}
