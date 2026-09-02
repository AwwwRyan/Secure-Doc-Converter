import { Monitor, Moon, Sun } from 'lucide-react';
import { useSettings, type ThemePreference } from '@/lib/store/settings';
import { cn } from '@/ui/cn';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex gap-0.5 rounded-full border border-line bg-bg p-[3px]"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'flex h-[22px] w-[26px] items-center justify-center rounded-full text-faint transition-colors',
            theme === value && 'bg-surface text-accent shadow-sm',
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
