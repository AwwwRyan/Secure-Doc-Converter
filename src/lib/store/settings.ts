import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'sdc.theme';

/**
 * UI preferences only. Per CLAUDE.md this store must never hold anything derived
 * from a user's document. `localStorage` is used for lightweight per-device
 * convenience and every access is guarded.
 */
interface SettingsState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

function readStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable — fall back to system */
  }
  return 'system';
}

function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') {
    delete root.dataset.theme;
    try {
      localStorage.removeItem(THEME_KEY);
    } catch {
      /* ignore */
    }
  } else {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }
}

export const useSettings = create<SettingsState>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
