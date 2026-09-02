import type { OptionsProps } from '@/tools/registry';
import { Field, RANGE_HINT, TextField, Toggle } from '@/tools/options/fields';

export function ExtractOptions({ value, onChange }: OptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Pages to keep" hint={RANGE_HINT}>
        <TextField
          ariaLabel="Pages to keep"
          value={String(value['range'] ?? '')}
          placeholder="2, 4-6"
          onChange={(range) => onChange({ ...value, range })}
        />
      </Field>
      <Toggle
        label="Save each page as a separate file (.zip)"
        checked={value['separate'] === true}
        onChange={(separate) => onChange({ ...value, separate })}
      />
    </div>
  );
}
