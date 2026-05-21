import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerAllIpcHandlers } from './ipc/registry'
import { registerTerminalHandlers } from './ipc/terminal'

/**
 * Create the main application window.
 * 
 * WHY frame: false — We use a custom title bar (Phase 5) to provide:
 * 1. A mode toggle button (Standard/LazyVim) on the left
 * 2. Custom-styled window controls on the right
 * 3. Consistent appearance across platforms
 * 
 * WHY sandbox: false — node-pty requires access to Node.js APIs in the
 * preload script. The preload uses contextBridge to safely expose only
 * the specific IPC channels the renderer needs.
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // frameless window for custom title bar (Phase 5)
    frame: false,
    titleBarStyle: 'hidden',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.mirage.editor')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register all IPC handlers before creating the window.
  // WHY before createWindow: The renderer may invoke IPC channels immediately
  // on mount (e.g., terminal:spawn). Handlers must be ready before the
  // renderer's React tree mounts.
  registerAllIpcHandlers()
  registerTerminalHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
