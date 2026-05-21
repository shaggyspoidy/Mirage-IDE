import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

/**
 * VSCode Importer
 * 
 * Attempts to locate and parse the user's VS Code settings.json file.
 * We strip comments before parsing because VS Code allows JSON with comments (JSONC),
 * which the standard JSON.parse cannot handle.
 */
export async function getVsCodeSettings(): Promise<any> {
  let appData = process.env.APPDATA
  let settingsPath = ''

  if (process.platform === 'win32' && appData) {
    settingsPath = path.join(appData, 'Code', 'User', 'settings.json')
  } else if (process.platform === 'darwin') {
    settingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json')
  } else {
    settingsPath = path.join(os.homedir(), '.config', 'Code', 'User', 'settings.json')
  }

  try {
    const raw = await fs.readFile(settingsPath, 'utf-8')
    // Strip single-line and multi-line comments
    const cleanRaw = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    return JSON.parse(cleanRaw)
  } catch (err) {
    console.log('[VSCode Importer] Could not read VS Code settings (they might not exist).')
    return null
  }
}
