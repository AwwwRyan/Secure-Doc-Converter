import type { OptionsProps } from '@/tools/registry';
import { Field, RadioRow } from '@/tools/options/fields';

const PRESETS = [
  {
    value: 'balanced',
    label: 'Balanced',
    hint: 'Recompress photos at good quality — recommended',
  },
  {
    value: 'screen',
    label: 'Smallest',
    hint: 'Heavier photo compression and downscaling; for screen viewing',
  },
  {
    value: 'light',
    label: 'Lossless tidy-up',
    hint: 'Strip metadata and repack only — images untouched',
  },
] as const;

export function CompressOptions({ value, onChange }: OptionsProps) {
  return (
    <Field
      label="Compression level"
      hint="Vector-only or already-optimised PDFs may barely change."
    >
      <RadioRow
        name="Compression level"
        options={PRESETS}
        value={String(value['preset'] ?? 'balanced') as (typeof PRESETS)[number]['value']}
        onChange={(preset) => onChange({ ...value, preset })}
      />
    </Field>
  );
}
