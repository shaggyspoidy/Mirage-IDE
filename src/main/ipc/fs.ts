import { ipcMain } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { getVsCodeSettings } from '../services/vscode-importer'

/**
 * File System IPC Handlers
 * 
 * Provides safe access to the local file system for the renderer process.
 */

// Binary/large file extensions to skip during search
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.mp4', '.mp3', '.wav', '.avi', '.mov',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.lock', '.map'
])

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', '.vscode',
  '__pycache__', '.cache', 'coverage', '.turbo'
])

export function registerFsHandlers(): void {
  /**
   * Read the contents of a directory.
   */
  ipcMain.handle('fs:read-dir', async (_event, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      return sorted.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name)
      }))
    } catch (error) {
      console.error(`[FS] Error reading dir ${dirPath}:`, error)
      throw error
    }
  })

  /**
   * Read the contents of a text file.
   */
  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    try {
      return await fs.readFile(filePath, 'utf-8')
    } catch (error) {
      console.error(`[FS] Error reading file ${filePath}:`, error)
      throw error
    }
  })

  /**
   * Write content to a text file.
   */
  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    try {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      console.error(`[FS] Error writing file ${filePath}:`, error)
      throw error
    }
  })

  /**
   * Create a new directory.
   */
  ipcMain.handle('fs:create-dir', async (_event, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      console.error(`[FS] Error creating dir ${dirPath}:`, error)
      throw error
    }
  })

  /**
   * Rename a file or directory.
   */
  ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      await fs.rename(oldPath, newPath)
    } catch (error) {
      console.error(`[FS] Error renaming ${oldPath}:`, error)
      throw error
    }
  })

  /**
   * Delete a file or directory.
   */
  ipcMain.handle('fs:delete', async (_event, targetPath: string) => {
    try {
      const stat = await fs.stat(targetPath)
      if (stat.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true })
      } else {
        await fs.unlink(targetPath)
      }
    } catch (error) {
      console.error(`[FS] Error deleting ${targetPath}:`, error)
      throw error
    }
  })

  /**
   * Search files recursively for a query string.
   * Returns an array of { file, line, lineNumber, column } matches.
   * Limited to 200 results to prevent UI flooding.
   */
  ipcMain.handle('fs:search-files', async (_event, rootPath: string, query: string) => {
    const results: { file: string; fileName: string; line: string; lineNumber: number; column: number }[] = []
    const MAX_RESULTS = 200

    async function searchDir(dirPath: string): Promise<void> {
      if (results.length >= MAX_RESULTS) return

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        for (const entry of entries) {
          if (results.length >= MAX_RESULTS) return

          const fullPath = path.join(dirPath, entry.name)

          if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
              await searchDir(fullPath)
            }
          } else {
            const ext = path.extname(entry.name).toLowerCase()
            if (SKIP_EXTENSIONS.has(ext)) continue

            try {
              const content = await fs.readFile(fullPath, 'utf-8')
              const lines = content.split('\n')
              const lowerQuery = query.toLowerCase()

              for (let i = 0; i < lines.length; i++) {
                if (results.length >= MAX_RESULTS) return
                const col = lines[i].toLowerCase().indexOf(lowerQuery)
                if (col !== -1) {
                  results.push({
                    file: fullPath,
                    fileName: entry.name,
                    line: lines[i].trim().substring(0, 200), // Trim long lines
                    lineNumber: i + 1,
                    column: col + 1
                  })
                }
              }
            } catch {
              // Skip files that can't be read as text
            }
          }
        }
      } catch {
        // Skip dirs we can't access
      }
    }

    await searchDir(rootPath)
    return results
  })

  /**
   * Get a compact project tree with file contents for context injection.
   * Skips node_modules, .git, etc. Reads text files under 50KB.
   * Returns { tree: string, files: { path, content }[] }
   */
  ipcMain.handle('fs:get-project-context', async (_event, rootPath: string) => {
    const MAX_FILE_SIZE = 50 * 1024 // 50KB
    const files: { path: string; relativePath: string; content: string }[] = []
    const treeLines: string[] = []

    async function walkDir(dirPath: string, prefix: string, depth: number): Promise<void> {
      if (depth > 6) return // Max depth to avoid massive trees

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        const sorted = entries
          .filter(e => !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'))
          .sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1
            if (!a.isDirectory() && b.isDirectory()) return 1
            return a.name.localeCompare(b.name)
          })

        for (let i = 0; i < sorted.length; i++) {
          const entry = sorted[i]
          const isLast = i === sorted.length - 1
          const connector = isLast ? '└── ' : '├── '
          const childPrefix = isLast ? '    ' : '│   '
          const fullPath = path.join(dirPath, entry.name)
          const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/')

          if (entry.isDirectory()) {
            treeLines.push(`${prefix}${connector}${entry.name}/`)
            await walkDir(fullPath, prefix + childPrefix, depth + 1)
          } else {
            const ext = path.extname(entry.name).toLowerCase()
            if (SKIP_EXTENSIONS.has(ext)) continue

            treeLines.push(`${prefix}${connector}${entry.name}`)

            // Read small text files for context
            try {
              const stat = await fs.stat(fullPath)
              if (stat.size <= MAX_FILE_SIZE) {
                const content = await fs.readFile(fullPath, 'utf-8')
                files.push({ path: fullPath, relativePath, content })
              }
            } catch {
              // Skip unreadable files
            }
          }
        }
      } catch {
        // Skip inaccessible dirs
      }
    }

    await walkDir(rootPath, '', 0)

    return {
      tree: treeLines.join('\n'),
      files
    }
  })

  /**
   * Import VS Code Settings
   */
  ipcMain.handle('fs:import-vscode-settings', async () => {
    return await getVsCodeSettings()
  })
}
