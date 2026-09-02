import { useSettings, type ThemePreference } from '@/lib/store/settings';
import { cn } from '@/ui/cn';

const THEMES: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPage() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  return (
    <div className="flex max-w-[52ch] flex-col gap-6">
      <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-ink">Theme</h2>
        <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-2">
          {THEMES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex items-center gap-2.5 rounded-[var(--radius-ctl)] border px-3 py-2.5 text-left text-[13px]',
                theme === value
                  ? 'border-accent bg-accent-wash text-accent'
                  : 'border-line bg-surface text-ink',
              )}
            >
              <span
                className={cn(
                  'h-4 w-4 rounded-full border-[1.6px]',
                  theme === value ? 'border-accent bg-accent' : 'border-faint',
                )}
              />
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-faint">
          Saved to this browser only. It&rsquo;s the one thing stored locally — never anything from
          a document.
        </p>
      </section>
    </div>
  );
}
