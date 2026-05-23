import { ipcMain, BrowserWindow } from 'electron'
import { ptyManager } from '../services/pty-manager'

export function registerTerminalHandlers(): void {
  ipcMain.on('terminal:spawn', (event, cols: number, rows: number, cwd?: string) => {
    ptyManager.spawn(cols, rows, cwd)

    ptyManager.onData((data) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) {
        win.webContents.send('terminal:data', data)
      }
    })
  })

  ipcMain.on('terminal:write', (_event, data: string) => {
    ptyManager.write(data)
  })

  ipcMain.on('terminal:resize', (_event, cols: number, rows: number) => {
    ptyManager.resize(cols, rows)
  })

  ipcMain.on('terminal:kill', () => {
    ptyManager.kill()
  })
}
