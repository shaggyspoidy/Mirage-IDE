import { ipcMain, IpcMainInvokeEvent } from 'electron'

/**
 * IPC Channel Registry — centralized registration pattern.
 * 
 * WHY centralized: As the app grows, IPC channels proliferate across files.
 * This registry ensures all channels are registered in one place during app
 * startup, making it easy to audit which channels exist and preventing
 * duplicate registrations.
 * 
 * Each module (terminal, ai, settings, etc.) exports a `registerXxxHandlers()`
 * function that this registry calls during initialization.
 */

type HandlerModule = {
  name: string
  register: () => void
}

const registeredModules: string[] = []

/**
 * Register a single IPC handler module.
 * Logs registration for debugging IPC channel issues.
 */
export function registerModule(module: HandlerModule): void {
  if (registeredModules.includes(module.name)) {
    console.warn(`IPC module "${module.name}" is already registered, skipping.`)
    return
  }
  module.register()
  registeredModules.push(module.name)
  console.log(`[IPC Registry] Registered module: ${module.name}`)
}

import { registerWindowHandlers } from './window'
import { registerDialogHandlers } from './dialog'
import { registerAiHandlers } from './ai'
import { registerFsHandlers } from './fs'
import { registerSettingsHandlers } from './settings'

/**
 * Register all IPC handler modules.
 * Called once during app.whenReady() in the main index.
 */
export function registerAllIpcHandlers(): void {
  registerModule({ name: 'window', register: registerWindowHandlers })
  registerModule({ name: 'dialog', register: registerDialogHandlers })
  registerModule({ name: 'ai', register: registerAiHandlers })
  registerModule({ name: 'fs', register: registerFsHandlers })
  registerModule({ name: 'settings', register: registerSettingsHandlers })

  // Future modules will be added here as phases are implemented:

  console.log(`[IPC Registry] All modules registered: [${registeredModules.join(', ')}]`)
}

/**
 * Utility: type-safe IPC handle wrapper.
 * WHY: Reduces boilerplate and ensures consistent error handling across all handlers.
 */
export function handleIpc<T>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<T> | T
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args)
    } catch (error) {
      console.error(`[IPC Error] ${channel}:`, error)
      throw error
    }
  })
}
