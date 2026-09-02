import type { OptionsProps } from '@/tools/registry';
import { Field, RANGE_HINT, TextField } from '@/tools/options/fields';

export function RemoveOptions({ value, onChange }: OptionsProps) {
  return (
    <Field label="Pages to remove" hint={RANGE_HINT}>
      <TextField
        ariaLabel="Pages to remove"
        value={String(value['range'] ?? '')}
        placeholder="1-3, 5"
        onChange={(range) => onChange({ ...value, range })}
      />
    </Field>
  );
}
