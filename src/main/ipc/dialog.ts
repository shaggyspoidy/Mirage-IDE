import { BrowserWindow, dialog, ipcMain } from 'electron'

/**
 * Dialog IPC Handlers
 * 
 * WHY Electron dialogs: The renderer (browser) cannot access the native OS
 * file picker. Electron's dialog module runs in the main process and returns
 * the selected paths back via IPC. This gives us native Windows Explorer
 * integration for Open File / Open Folder.
 */

export function registerDialogHandlers(): void {
  // Open a native folder picker dialog
  ipcMain.handle('dialog:open-folder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true, path: null }

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Open Folder in Mirage',
      defaultPath: process.platform === 'win32'
        ? process.env.HOMEDRIVE || 'C:\\'
        : '/'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null }
    }

    return { canceled: false, path: result.filePaths[0] }
  })

  // Open a native file picker dialog
  ipcMain.handle('dialog:open-file', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true, path: null }

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      title: 'Open File in Mirage',
      defaultPath: process.platform === 'win32'
        ? process.env.HOMEDRIVE || 'C:\\'
        : '/',
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'md', 'lua', 'rs', 'go', 'c', 'cpp', 'java'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null }
    }

    return { canceled: false, path: result.filePaths[0] }
  })
}
