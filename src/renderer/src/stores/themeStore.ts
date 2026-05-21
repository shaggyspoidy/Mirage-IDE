import { create } from 'zustand'

/**
 * Theme Store — manages active theme and persists preference to localStorage.
 * 
 * WHY localStorage for persistence: Theme preference is a renderer-only concern.
 * It doesn't need encryption (safeStorage) or main-process involvement.
 * localStorage survives page reloads and is synchronous on read, which
 * avoids a flash of wrong theme on startup.
 */

export type ThemeName = 'catppuccin-mocha' | 'dark' | 'light' | 'cyberpunk'

export const THEME_LABELS: Record<ThemeName, string> = {
  'catppuccin-mocha': 'Catppuccin Mocha',
  'dark': 'Dark',
  'light': 'Light',
  'cyberpunk': 'Cyberpunk'
}

interface ThemeState {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const STORAGE_KEY = 'mirage-theme'

function getStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in THEME_LABELS) {
      return stored as ThemeName
    }
  } catch {
    // localStorage may not be available in some contexts
  }
  return 'catppuccin-mocha'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getStoredTheme(),

  setTheme: (theme: ThemeName) => {
    localStorage.setItem(STORAGE_KEY, theme)
    set({ theme })
  }
}))
