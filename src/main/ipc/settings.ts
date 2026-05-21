import { ipcMain } from 'electron'
import { keyManager } from '../services/key-manager'
import type { ModelProvider } from '../../shared/types/model'

/**
 * Settings IPC Handlers
 * 
 * Exposes API key status management to the renderer.
 * Crucially, it never returns plain text keys back over IPC.
 */

export function registerSettingsHandlers(): void {
  /**
   * Save a new API key.
   */
  ipcMain.handle('settings:save-key', async (_event, provider: ModelProvider, key: string) => {
    return await keyManager.saveKey(provider, key)
  })

  /**
   * Get the status (true/false) of all provider keys.
   */
  ipcMain.handle('settings:get-key-status', async () => {
    return await keyManager.getKeyStatus()
  })

  /**
   * Delete an API key.
   */
  ipcMain.handle('settings:delete-key', async (_event, provider: ModelProvider) => {
    await keyManager.deleteKey(provider)
    return true
  })
}
