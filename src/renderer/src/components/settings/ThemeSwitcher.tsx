import { useThemeStore, THEME_LABELS, ThemeName } from '../../stores/themeStore'

/**
 * ThemeSwitcher Component
 * Displays a select dropdown for switching between themes.
 */
export function ThemeSwitcher(): React.JSX.Element {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="theme-select" className="text-sm font-semibold text-fg-secondary">
        Color Theme
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeName)}
        className="bg-bg-surface text-fg-primary border border-border-primary rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
      >
        {Object.entries(THEME_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
