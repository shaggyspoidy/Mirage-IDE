import { BrowserWindow, ipcMain } from 'electron'

/**
 * Window Controls IPC Handlers
 * 
 * WHY: Since we use a frameless window (frame: false), we must implement
 * our own title bar in the React renderer. The renderer cannot natively
 * minimize, maximize, or close the window, so it sends IPC messages here.
 */

export function registerWindowHandlers(): void {
  // Minimize the focused window
  ipcMain.on('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  // Maximize or restore the focused window
  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  // Close the focused window
  ipcMain.on('window:close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
  })
}
