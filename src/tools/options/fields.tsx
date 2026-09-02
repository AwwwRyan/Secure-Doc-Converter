import type { ReactNode } from 'react';
import { cn } from '@/ui/cn';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-[var(--radius-ctl)] border border-line bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-faint focus-visible:border-accent"
    />
  );
}

export function RadioRow<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex items-start gap-2.5 rounded-[var(--radius-ctl)] border px-3 py-2.5 text-left',
            value === opt.value ? 'border-accent bg-accent-wash' : 'border-line bg-surface',
          )}
        >
          <span
            className={cn(
              'mt-0.5 h-4 w-4 flex-none rounded-full border-[1.6px]',
              value === opt.value ? 'border-accent' : 'border-faint',
            )}
          >
            {value === opt.value && (
              <span className="block h-full w-full scale-[0.45] rounded-full bg-accent" />
            )}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold text-ink">{opt.label}</span>
            {opt.hint && <span className="text-[11.5px] text-muted">{opt.hint}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-[var(--radius-ctl)] border border-line bg-surface px-3 py-2.5 text-[12.5px] text-ink"
    >
      {label}
      <span
        className={cn(
          'relative h-5 w-9 flex-none rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left]',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

export const RANGE_HINT = 'e.g. 1-3, 5, 8-  (open end = to last page)';
