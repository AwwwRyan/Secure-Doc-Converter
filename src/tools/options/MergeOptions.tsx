import type { OptionsProps } from '@/tools/registry';
import { Toggle } from '@/tools/options/fields';

export function MergeOptions({ value, onChange }: OptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Toggle
        label="Add a blank page between documents"
        checked={value['blankBetween'] === true}
        onChange={(blankBetween) => onChange({ ...value, blankBetween })}
      />
      <p className="text-[11.5px] text-faint">
        Files merge top-to-bottom in the list. Drag the arrows to reorder.
      </p>
    </div>
  );
}
