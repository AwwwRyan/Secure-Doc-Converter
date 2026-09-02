import type { OptionsProps } from '@/tools/registry';
import { Field, NumberField, SelectField, Toggle } from '@/tools/options/fields';

const SIZES = [
  { value: 'fit', label: 'Fit each image' },
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
] as const;

const ORIENT = [
  { value: 'auto', label: 'Auto' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
] as const;

export function ImageToPdfOptions({ value, onChange }: OptionsProps) {
  const set = (patch: Record<string, unknown>) => onChange({ ...value, ...patch });
  const pageSize = String(value['pageSize'] ?? 'fit');

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Page size">
          <SelectField
            ariaLabel="Page size"
            value={pageSize as (typeof SIZES)[number]['value']}
            options={SIZES}
            onChange={(pageSize) => set({ pageSize })}
          />
        </Field>
        <Field label="Orientation">
          <SelectField
            ariaLabel="Orientation"
            value={String(value['orientation'] ?? 'auto') as (typeof ORIENT)[number]['value']}
            options={ORIENT}
            onChange={(orientation) => set({ orientation })}
          />
        </Field>
        <Field label="Margin">
          <NumberField
            ariaLabel="Margin"
            value={Number(value['margin'] ?? 0)}
            min={0}
            max={120}
            suffix="pt"
            onChange={(margin) => set({ margin })}
          />
        </Field>
      </div>
      <Toggle
        label="White background behind transparent images"
        checked={value['background'] !== false}
        onChange={(background) => set({ background })}
      />
      <p className="text-[11.5px] text-faint">
        One image per page, in the list order. Drag files to reorder.
      </p>
    </div>
  );
}
