import { WindowControls } from './WindowControls'
import { MenuBar } from './MenuBar'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { Play } from 'lucide-react'
import logo from '../../assets/logo.png'

/**
 * TitleBar
 * 
 * Replaces the default OS title bar. Uses CSS drag regions to allow dragging.
 * File operations hook directly into the workspaceStore to open files and folders.
 */
export function TitleBar(): React.JSX.Element {
  const toggleSettings = useSettingsStore((state) => state.toggleSettings)

  return (
    <div
      className="flex items-center justify-between w-full h-[36px] bg-[var(--m-bg-secondary)] shrink-0 select-none z-50 border-b border-[var(--m-border-primary)] drag"
    >
      {/* Left section: App Icon + File Menu */}
      <div className="flex items-center h-full">
        <div 
          onClick={toggleSettings}
          title="Settings"
          className="flex items-center h-full px-3 text-sm font-semibold text-[var(--m-fg-primary)] hover:bg-[var(--m-hover-bg)] cursor-pointer no-drag transition-colors"
        >
          <img src={logo} alt="Mirage Logo" className="w-5 h-5 mr-2 object-contain" />
          Mirage
        </div>

        {/* Menu Bar */}
        <MenuBar />
      </div>

      {/* Center section: Action Buttons (Moved to MenuBar) */}
      <div className="flex-1 flex justify-center items-center gap-2 no-drag">
      </div>
      {/* Right section: Window Controls & Extras */}
      <div className="flex items-center no-drag">
        {/* Vim Toggle */}
        <div className="flex items-center gap-2 mr-3 border-r border-[var(--m-border-primary)] pr-3">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--m-fg-muted)]">Vim</span>
          <button
            onClick={() => useSettingsStore.getState().setVimMode(!useSettingsStore.getState().vimMode)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${useSettingsStore((state) => state.vimMode) ? 'bg-[var(--m-accent-green)]' : 'bg-[#00000040] border border-[var(--m-border-primary)]'}`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useSettingsStore((state) => state.vimMode) ? 'translate-x-3.5' : 'translate-x-0.5'}`}
            />
          </button>
        </div>

        <WindowControls />
      </div>
    </div>
  )
}
