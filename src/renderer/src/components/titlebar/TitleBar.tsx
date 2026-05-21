import { WindowControls } from './WindowControls'
import { MenuBar } from './MenuBar'
import { useSettingsStore } from '../../stores/settingsStore'
import logoLight from '../../assets/logo-light.png'
import logoDark from '../../assets/logo-dark.jpg'

/**
 * TitleBar
 * 
 * Replaces the default OS title bar. Uses CSS drag regions to allow dragging.
 * File operations hook directly into the workspaceStore to open files and folders.
 */
export function TitleBar(): React.JSX.Element {
  const toggleSettings = useSettingsStore((state) => state.toggleSettings)
  const theme = useSettingsStore((state) => state.theme)

  const logoUrl = theme.includes('light') ? logoLight : logoDark

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
          <img src={logoUrl} alt="Mirage Logo" className="w-4 h-4 mr-2 object-contain" />
          Mirage
        </div>

        {/* Menu Bar */}
        <MenuBar />
      </div>

      {/* Center section: Spacer */}
      <div className="flex-1 flex justify-center no-drag">
      </div>

      {/* Right section: Window Controls */}
      <WindowControls />
    </div>
  )
}
