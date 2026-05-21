import { useEffect } from 'react'
import { useThemeStore } from '../stores/themeStore'

/**
 * useTheme — applies the active theme to the document root.
 * 
 * WHY data-theme attribute on <html>: CSS selectors like [data-theme="dark"]
 * cascade to all child elements. This is the simplest way to swap all CSS
 * variable values at once without JavaScript touching individual elements.
 * 
 * This hook must be called once at the app root (App.tsx).
 */
export function useTheme(): void {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
}

/**
 * Returns the current xterm.js theme object derived from CSS variables.
 * WHY a function instead of reading CSS vars: xterm.js has its own theme
 * object that must be set programmatically. We read the computed CSS
 * variable values and build the xterm theme object from them.
 */
export function getXtermThemeFromCss(): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  const get = (name: string): string => style.getPropertyValue(name).trim()

  return {
    background: get('--m-term-bg'),
    foreground: get('--m-term-fg'),
    cursor: get('--m-term-cursor'),
    selectionBackground: get('--m-term-selection'),
    black: get('--m-term-black'),
    red: get('--m-term-red'),
    green: get('--m-term-green'),
    yellow: get('--m-term-yellow'),
    blue: get('--m-term-blue'),
    magenta: get('--m-term-magenta'),
    cyan: get('--m-term-cyan'),
    white: get('--m-term-white'),
    brightBlack: get('--m-term-black'),
    brightRed: get('--m-term-red'),
    brightGreen: get('--m-term-green'),
    brightYellow: get('--m-term-yellow'),
    brightBlue: get('--m-term-blue'),
    brightMagenta: get('--m-term-magenta'),
    brightCyan: get('--m-term-cyan'),
    brightWhite: get('--m-term-white')
  }
}
