import type * as monaco from 'monaco-editor'

/**
 * Extracts a CSS variable value from the document root
 */
const getCssVar = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * Dynamically builds and registers a Monaco editor theme
 * based on the active CSS variables in the DOM.
 */
export const syncMonacoTheme = (editorApi: typeof monaco) => {
  // Read colors from CSS variables
  const bgPrimary = getCssVar('--m-bg-primary') || '#1e1e2e'
  const bgSecondary = getCssVar('--m-bg-secondary') || '#181825'
  const bgSurface = getCssVar('--m-bg-surface') || '#313244'
  const bgOverlay = getCssVar('--m-bg-overlay') || '#45475a'

  const fgPrimary = getCssVar('--m-fg-primary') || '#cdd6f4'
  const fgSecondary = getCssVar('--m-fg-secondary') || '#bac2de'
  const fgMuted = getCssVar('--m-fg-muted') || '#6c7086'

  const borderPrimary = getCssVar('--m-border-primary') || '#313244'
  const borderSecondary = getCssVar('--m-border-secondary') || '#45475a'

  const accentBlue = getCssVar('--m-accent-blue') || '#89b4fa'
  const accentGreen = getCssVar('--m-accent-green') || '#a6e3a1'
  const accentRed = getCssVar('--m-accent-red') || '#f38ba8'
  const accentYellow = getCssVar('--m-accent-yellow') || '#f9e2af'
  const accentPurple = getCssVar('--m-accent-purple') || '#cba6f7'
  const accentPink = getCssVar('--m-accent-pink') || '#f5c2e7'
  const accentTeal = getCssVar('--m-accent-teal') || '#94e2d5'
  const accentPeach = getCssVar('--m-accent-peach') || '#fab387'

  editorApi.editor.defineTheme('mirage-dynamic', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: fgMuted, fontStyle: 'italic' },
      
      { token: 'keyword', foreground: accentPurple },
      { token: 'control', foreground: accentPurple },
      { token: 'storage', foreground: accentPurple },
      { token: 'modifier', foreground: accentPurple },
      
      { token: 'type', foreground: accentYellow },
      { token: 'class', foreground: accentYellow },
      { token: 'interface', foreground: accentYellow },
      
      { token: 'function', foreground: accentBlue },
      { token: 'method', foreground: accentBlue },
      
      { token: 'variable', foreground: fgPrimary },
      { token: 'property', foreground: fgPrimary },
      { token: 'parameter', foreground: fgSecondary },
      
      { token: 'string', foreground: accentGreen },
      { token: 'string.escape', foreground: accentPink },
      
      { token: 'number', foreground: accentPeach },
      { token: 'boolean', foreground: accentPeach },
      { token: 'constant', foreground: accentPeach },
      
      { token: 'operator', foreground: accentTeal },
      { token: 'delimiter', foreground: fgSecondary },
      
      { token: 'tag', foreground: accentPink },
      { token: 'attribute.name', foreground: accentTeal },
      { token: 'attribute.value', foreground: accentGreen },
    ],
    colors: {
      'editor.background': bgPrimary,
      'editor.foreground': fgPrimary,
      'editorCursor.foreground': accentBlue,
      'editor.selectionBackground': bgOverlay + '80', // Add some transparency
      'editor.inactiveSelectionBackground': bgSurface + '80',
      'editor.lineHighlightBackground': bgSecondary,
      'editorLineNumber.foreground': fgMuted,
      'editorLineNumber.activeForeground': fgPrimary,
      'editorIndentGuide.background': borderPrimary,
      'editorIndentGuide.activeBackground': borderSecondary,
      'editorWidget.background': bgSurface,
      'editorWidget.border': borderPrimary,
      'editorSuggestWidget.background': bgSurface,
      'editorSuggestWidget.border': borderPrimary,
      'editorSuggestWidget.selectedBackground': bgOverlay,
      'editorHoverWidget.background': bgSurface,
      'editorHoverWidget.border': borderPrimary,
      'editorError.foreground': accentRed,
      'editorWarning.foreground': accentYellow,
      'editorInfo.foreground': accentBlue,
    }
  })

  // Apply the newly compiled theme
  editorApi.editor.setTheme('mirage-dynamic')
}
