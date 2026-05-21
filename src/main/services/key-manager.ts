import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import type { ModelProvider } from '../../shared/types/model'

const KEYS_FILE = 'keys.json'

interface EncryptedKeys {
  [provider: string]: string // provider -> base64 encrypted string (or fallback base64)
}

/**
 * KeyManager handles secure storage of API keys using Electron's safeStorage.
 * safeStorage uses native OS encryption (DPAPI on Windows, Keychain on macOS).
 */
class KeyManager {
  private keysFilePath: string
  private cachedKeys: EncryptedKeys = {}
  private initialized = false

  constructor() {
    this.keysFilePath = path.join(app.getPath('userData'), KEYS_FILE)
  }

  /**
   * Ensure keys are loaded from disk.
   */
  async loadKeys(): Promise<void> {
    if (this.initialized) return
    try {
      const data = await fs.readFile(this.keysFilePath, 'utf-8')
      this.cachedKeys = JSON.parse(data)
    } catch (err) {
      // File doesn't exist or is invalid JSON
      this.cachedKeys = {}
    }
    this.initialized = true
  }

  /**
   * Encrypt and save a key.
   */
  async saveKey(provider: ModelProvider, key: string): Promise<boolean> {
    await this.loadKeys()
    if (!key || !key.trim()) return false

    let encryptedKey: string
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(key)
      encryptedKey = buffer.toString('base64')
    } else {
      console.warn('[KeyManager] safeStorage is not available. Storing key with fallback base64 encoding (NOT SECURE).')
      encryptedKey = Buffer.from(key, 'utf-8').toString('base64')
    }

    this.cachedKeys[provider] = encryptedKey
    await this.persist()
    return true
  }

  /**
   * Retrieve and decrypt a key.
   * This is used internally by the AI clients and is NEVER sent back to the renderer.
   */
  async getKey(provider: ModelProvider): Promise<string | null> {
    await this.loadKeys()
    const encryptedKey = this.cachedKeys[provider]
    if (!encryptedKey) return null

    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedKey, 'base64')
        return safeStorage.decryptString(buffer)
      } else {
        return Buffer.from(encryptedKey, 'base64').toString('utf-8')
      }
    } catch (err) {
      console.error(`[KeyManager] Failed to decrypt key for ${provider}:`, err)
      return null
    }
  }

  /**
   * Delete a key.
   */
  async deleteKey(provider: ModelProvider): Promise<void> {
    await this.loadKeys()
    delete this.cachedKeys[provider]
    await this.persist()
  }

  /**
   * Return a boolean map indicating which providers have keys configured.
   * This is safe to send to the renderer.
   */
  async getKeyStatus(): Promise<Record<string, boolean>> {
    await this.loadKeys()
    const status: Record<string, boolean> = {}
    for (const provider of ['openai', 'anthropic', 'google']) {
      status[provider] = !!this.cachedKeys[provider]
    }
    return status
  }

  private async persist(): Promise<void> {
    await fs.writeFile(this.keysFilePath, JSON.stringify(this.cachedKeys, null, 2), 'utf-8')
  }
}

export const keyManager = new KeyManager()
