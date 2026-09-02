import type { OptionsProps } from '@/tools/registry';
import { Field, RadioRow, RANGE_HINT, TextField } from '@/tools/options/fields';

const ANGLES = [
  { value: '90', label: '90° clockwise' },
  { value: '180', label: '180°' },
  { value: '270', label: '90° counter-clockwise' },
] as const;

const SCOPES = [
  { value: 'all', label: 'All pages' },
  { value: 'range', label: 'Selected pages' },
] as const;

export function RotateOptions({ value, onChange }: OptionsProps) {
  const scope = String(value['scope'] ?? 'all');
  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Rotation">
        <RadioRow
          name="Rotation"
          options={ANGLES}
          value={String(value['angle'] ?? '90') as '90' | '180' | '270'}
          onChange={(a) => onChange({ ...value, angle: Number.parseInt(a, 10) })}
        />
      </Field>
      <Field label="Apply to">
        <RadioRow
          name="Apply to"
          options={SCOPES}
          value={scope as 'all' | 'range'}
          onChange={(s) => onChange({ ...value, scope: s })}
        />
      </Field>
      {scope === 'range' && (
        <Field label="Pages" hint={RANGE_HINT}>
          <TextField
            ariaLabel="Pages to rotate"
            value={String(value['range'] ?? '')}
            placeholder="1, 3-5"
            onChange={(range) => onChange({ ...value, range })}
          />
        </Field>
      )}
    </div>
  );
}
