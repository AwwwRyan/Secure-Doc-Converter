import type { OptionsProps } from '@/tools/registry';
import {
  Field,
  NumberField,
  RANGE_HINT,
  SelectField,
  TextField,
  Toggle,
} from '@/tools/options/fields';

const UNITS = [
  { value: 'pt', label: 'points' },
  { value: 'percent', label: 'percent' },
] as const;

export function CropOptions({ value, onChange }: OptionsProps) {
  const set = (patch: Record<string, unknown>) => onChange({ ...value, ...patch });
  const unit = String(value['unit'] ?? 'pt') as 'pt' | 'percent';
  const uniform = value['uniform'] === true;

  const setSide = (side: string, v: number) => {
    if (uniform) set({ top: v, right: v, bottom: v, left: v });
    else set({ [side]: v });
  };

  const suffix = unit === 'percent' ? '%' : 'pt';

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Trim unit">
        <SelectField
          ariaLabel="Trim unit"
          value={unit}
          options={UNITS}
          onChange={(u) => set({ unit: u })}
        />
      </Field>

      <Toggle
        label="Same margin on all sides"
        checked={uniform}
        onChange={(u) => {
          const v = Number(value['top'] ?? 0);
          set(u ? { uniform: true, right: v, bottom: v, left: v } : { uniform: false });
        }}
      />

      {uniform ? (
        <Field label={`Trim from every edge (${suffix})`}>
          <NumberField
            ariaLabel="Trim"
            value={Number(value['top'] ?? 0)}
            min={0}
            onChange={(v) => setSide('top', v)}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Field key={side} label={`${side[0]!.toUpperCase()}${side.slice(1)} (${suffix})`}>
              <NumberField
                ariaLabel={`Trim ${side}`}
                value={Number(value[side] ?? 0)}
                min={0}
                onChange={(v) => setSide(side, v)}
              />
            </Field>
          ))}
        </div>
      )}

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
