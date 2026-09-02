import type { OptionsProps } from '@/tools/registry';
import {
  ColorField,
  Field,
  NumberField,
  RANGE_HINT,
  SelectField,
  TextField,
  Toggle,
} from '@/tools/options/fields';

const FORMATS = [
  { value: 'n', label: '1, 2, 3 …' },
  { value: 'n-of-total', label: '1 / 10' },
  { value: 'page-n-of-total', label: 'Page 1 of 10' },
  { value: 'roman', label: 'i, ii, iii …' },
] as const;

const POSITIONS = [
  { value: 'bottom-center', label: 'Bottom centre' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-center', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
] as const;

export function PageNumberOptions({ value, onChange }: OptionsProps) {
  const set = (patch: Record<string, unknown>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Format">
          <SelectField
            ariaLabel="Format"
            value={String(value['format'] ?? 'n') as (typeof FORMATS)[number]['value']}
            options={FORMATS}
            onChange={(format) => set({ format })}
          />
        </Field>
        <Field label="Position">
          <SelectField
            ariaLabel="Position"
            value={
              String(value['position'] ?? 'bottom-center') as (typeof POSITIONS)[number]['value']
            }
            options={POSITIONS}
            onChange={(position) => set({ position })}
          />
        </Field>
        <Field label="Start at">
          <NumberField
            ariaLabel="Start at"
            value={Number(value['startAt'] ?? 1)}
            min={0}
            onChange={(startAt) => set({ startAt })}
          />
        </Field>
        <Field label="Size">
          <NumberField
            ariaLabel="Font size"
            value={Number(value['fontSize'] ?? 11)}
            min={6}
            max={48}
            suffix="pt"
            onChange={(fontSize) => set({ fontSize })}
          />
        </Field>
        <Field label="Margin">
          <NumberField
            ariaLabel="Margin"
            value={Number(value['margin'] ?? 28)}
            min={0}
            max={200}
            suffix="pt"
            onChange={(margin) => set({ margin })}
          />
        </Field>
        <Field label="Colour">
          <ColorField
            ariaLabel="Colour"
            value={String(value['color'] ?? '#333333')}
            onChange={(color) => set({ color })}
          />
        </Field>
      </div>

      <Toggle
        label="Don't number the first page"
        checked={value['skipFirst'] === true}
        onChange={(skipFirst) => set({ skipFirst })}
      />

      <Field label="Pages" hint={RANGE_HINT}>
        <TextField
          ariaLabel="Pages"
          value={String(value['range'] ?? '')}
          placeholder="all pages"
          onChange={(range) => set({ range })}
        />
      </Field>
    </div>
  );
}
