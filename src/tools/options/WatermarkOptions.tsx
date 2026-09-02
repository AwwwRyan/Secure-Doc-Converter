import type { OptionsProps } from '@/tools/registry';
import {
  ColorField,
  Field,
  NumberField,
  RadioRow,
  RANGE_HINT,
  Slider,
  TextField,
} from '@/tools/options/fields';

const LAYOUTS = [
  { value: 'center', label: 'Centered, diagonal' },
  { value: 'tile', label: 'Tiled across the page' },
  { value: 'top', label: 'Top banner' },
  { value: 'bottom', label: 'Bottom banner' },
] as const;

export function WatermarkOptions({ value, onChange }: OptionsProps) {
  const set = (patch: Record<string, unknown>) => onChange({ ...value, ...patch });
  const opacity = Number(value['opacity'] ?? 0.2);

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Text">
        <TextField
          ariaLabel="Watermark text"
          value={String(value['text'] ?? '')}
          placeholder="CONFIDENTIAL"
          onChange={(text) => set({ text })}
        />
      </Field>

      <Field label="Placement">
        <RadioRow
          name="Placement"
          options={LAYOUTS}
          value={String(value['layout'] ?? 'center') as (typeof LAYOUTS)[number]['value']}
          onChange={(layout) => set({ layout })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Size">
          <NumberField
            ariaLabel="Font size"
            value={Number(value['fontSize'] ?? 48)}
            min={6}
            max={200}
            suffix="pt"
            onChange={(fontSize) => set({ fontSize })}
          />
        </Field>
        <Field label="Rotation">
          <NumberField
            ariaLabel="Rotation"
            value={Number(value['rotationDeg'] ?? 45)}
            min={-90}
            max={90}
            suffix="°"
            onChange={(rotationDeg) => set({ rotationDeg })}
          />
        </Field>
        <Field label="Colour">
          <ColorField
            ariaLabel="Colour"
            value={String(value['color'] ?? '#111111')}
            onChange={(color) => set({ color })}
          />
        </Field>
        <Field label={`Opacity — ${Math.round(opacity * 100)}%`}>
          <Slider
            ariaLabel="Opacity"
            value={opacity}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(v) => set({ opacity: v })}
          />
        </Field>
      </div>

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
