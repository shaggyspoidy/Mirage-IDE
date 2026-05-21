import * as os from 'os'
import * as pty from 'node-pty'

class PtyManager {
  private ptyProcess: pty.IPty | null = null
  private onDataCallback: ((data: string) => void) | null = null

  spawn(cols: number = 80, rows: number = 24) {
    if (this.ptyProcess) {
      this.kill()
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: cols,
      rows: rows,
      cwd: process.env.HOME || process.env.USERPROFILE,
      env: process.env as Record<string, string>
    })

    this.ptyProcess.onData((data) => {
      if (this.onDataCallback) {
        this.onDataCallback(data)
      }
    })
  }

  write(data: string) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data)
    }
  }

  resize(cols: number, rows: number) {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows)
    }
  }

  kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill()
      this.ptyProcess = null
    }
  }

  onData(callback: (data: string) => void) {
    this.onDataCallback = callback
  }
}

export const ptyManager = new PtyManager()
