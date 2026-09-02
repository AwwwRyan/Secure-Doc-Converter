import { Info } from 'lucide-react';
import type { OptionsProps } from '@/tools/registry';
import { Field, PasswordField } from '@/tools/options/fields';

export function UnlockOptions({ value, onChange }: OptionsProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <Field
        label="Password"
        hint="Leave blank if the PDF only has printing / copying restrictions (no open password)."
      >
        <PasswordField
          ariaLabel="Document password"
          value={String(value['password'] ?? '')}
          placeholder="the password you already know"
          onChange={(password) => onChange({ ...value, password })}
        />
      </Field>

      <div className="flex gap-2.5 rounded-[var(--radius-ctl)] border border-line bg-bg p-3 text-[12px] leading-relaxed text-muted">
        <Info size={15} className="mt-0.5 flex-none text-faint" />
        <span>
          This tool doesn’t guess, crack or recover passwords. If you don’t know it, it can’t help —
          by design. Only unlock PDFs you own or are permitted to unlock.
        </span>
      </div>
    </div>
  );
}
