/**
 * WindowControls
 * 
 * WHY: Renders the standard Minimize, Maximize, and Close buttons for the app.
 * We use the windowApi exposed via preload to trigger these actions in the main process.
 */

export function WindowControls(): React.JSX.Element {
  return (
    <div className="flex items-center h-full no-drag">
      <button
        onClick={() => window.api.window.minimize()}
        className="h-full px-4 text-[var(--m-fg-primary)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-200 focus:outline-none flex items-center justify-center"
        aria-label="Minimize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
        </svg>
      </button>

      <button
        onClick={() => window.api.window.maximize()}
        className="h-full px-4 text-[var(--m-fg-primary)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-200 focus:outline-none flex items-center justify-center"
        aria-label="Maximize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      <button
        onClick={() => window.api.window.close()}
        className="h-full px-4 text-[var(--m-fg-primary)] hover:bg-[#e81123] hover:text-white transition-colors duration-200 focus:outline-none flex items-center justify-center"
        aria-label="Close"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 3L9 9M9 3L3 9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
