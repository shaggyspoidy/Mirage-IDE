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

  /**
   * Get Git Information (branch and dirty count)
   */
  ipcMain.handle('fs:get-git-info', async (_event, folderPath: string) => {
    return new Promise((resolve) => {
      const { exec } = require('child_process')
      
      // Get branch name
      exec('git rev-parse --abbrev-ref HEAD', { cwd: folderPath }, (error: any, stdout: string) => {
        if (error) {
          resolve(null) // Not a git repo or git not installed
          return
        }
        
        const branch = stdout.trim()
        
        // Get dirty count
        exec('git status --porcelain', { cwd: folderPath }, (err: any, out: string) => {
          let dirtyCount = 0
          if (!err && out) {
            // Count non-empty lines
            dirtyCount = out.split('\n').filter(line => line.trim().length > 0).length
          }
          resolve({ branch, dirtyCount })
        })
      })
    })
  })

  /**
   * Get Git Status details (list of changed files)
   */
  ipcMain.handle('fs:get-git-status', async (_event, folderPath: string) => {
    return new Promise((resolve) => {
      const { exec } = require('child_process')
      exec('git status --porcelain', { cwd: folderPath }, (error: any, stdout: string) => {
        if (error) {
          resolve([])
          return
        }
        
        const files: { path: string; status: string }[] = []
        const lines = stdout.split('\n').filter(line => line.length > 0)
        
        for (const line of lines) {
          // git status --porcelain format: "XY filename" or "XY orig -> new"
          const status = line.substring(0, 2)
          // Handle renames (e.g., "R  old -> new")
          const filePath = line.substring(3).split(' -> ').pop()?.trim() || ''
          
          if (filePath) {
            files.push({
              path: path.join(folderPath, filePath.replace(/^"(.*)"$/, '$1')), // Handle quotes
              status
            })
          }
        }
        resolve(files)
      })
    })
  })

  /**
   * Commit changes (Auto-stages all)
   */
  ipcMain.handle('fs:git-commit', async (_event, folderPath: string, message: string) => {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')
      // Stage all changes
      exec('git add .', { cwd: folderPath }, (addError: any) => {
        if (addError) {
          reject(new Error(`Git add failed: ${addError.message}`))
          return
        }
        
        // Escape quotes in commit message
        const escapedMessage = message.replace(/"/g, '\\"')
        
        exec(`git commit -m "${escapedMessage}"`, { cwd: folderPath }, (commitError: any, stdout: string) => {
          if (commitError) {
            reject(new Error(`Git commit failed: ${commitError.message}`))
            return
          }
          resolve(stdout)
        })
      })
    })
  })

  /**
   * Get file content at HEAD for diffing
   */
  ipcMain.handle('fs:get-file-content-at-head', async (_event, folderPath: string, filePath: string) => {
    return new Promise((resolve) => {
      const { exec } = require('child_process')
      // Get path relative to the repo root
      const relativePath = path.relative(folderPath, filePath).replace(/\\/g, '/')
      
      exec(`git show HEAD:"${relativePath}"`, { cwd: folderPath, maxBuffer: 1024 * 1024 * 10 }, (error: any, stdout: string) => {
        if (error) {
          // Could be a new file (untracked)
          resolve('')
          return
        }
        resolve(stdout)
      })
    })
  })

  /**
   * Check if repository has remote configured
   */
  ipcMain.handle('fs:git-get-remotes', async (_event, folderPath: string) => {
    return new Promise((resolve) => {
      const { exec } = require('child_process')
      exec('git remote -v', { cwd: folderPath }, (error: any, stdout: string) => {
        if (error || !stdout) {
          resolve(false)
          return
        }
        resolve(stdout.trim().length > 0)
      })
    })
  })

  /**
   * Git Pull
   */
  ipcMain.handle('fs:git-pull', async (_event, folderPath: string) => {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')
      exec('git pull', { cwd: folderPath }, (error: any, stdout: string) => {
        if (error) {
          reject(new Error(`Git pull failed: ${error.message}`))
          return
        }
        resolve(stdout)
      })
    })
  })

  /**
   * Git Push
   */
  ipcMain.handle('fs:git-push', async (_event, folderPath: string) => {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')
      // Note: Assumes current branch tracks a remote
      exec('git push', { cwd: folderPath }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          // git push often outputs to stderr even on success, but if error is set, it failed
          reject(new Error(`Git push failed: ${stderr || error.message}`))
          return
        }
        resolve(stdout || stderr) // sometimes success message is in stderr
      })
    })
  })
}
