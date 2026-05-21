# Mirage IDE 💠

Mirage is a next-generation, agent-first Integrated Development Environment (IDE) built with Electron, React, TypeScript, and TailwindCSS. It goes beyond simple code completion by integrating an AI agent as a core pair-programming partner that proposes, stages, and contextualizes changes natively within your workflow.

## ✨ Key Features

### 🤖 Agent-First Architecture
- **Built-in AI Assistant:** A dedicated Chat Panel on the right provides seamless communication with the AI.
- **Pending Diff System:** When the AI proposes a code modification, it doesn't just print code blocks or overwrite your files. Instead, it opens a side-by-side `Monaco DiffEditor` staging area. You can visually review the changes (deleted lines in red, added lines in green) and choose to **Accept** or **Reject** them.
- **Command Proposals:** The AI can propose terminal commands. These appear as interactive widgets in the chat. You remain in full control by clicking **"Run"** to execute them in the integrated terminal, ensuring no commands run without your explicit permission.

### 🎨 Advanced Theming Engine
- **Dynamic CSS Variables:** A robust, fully dynamic theming system powered by CSS variables.
- **Curated Themes:** Ships with premium, VS Code, and Obsidian-inspired themes including:
  - **Cyberpunk:** A striking pitch-black aesthetic with neon-yellow accents.
  - **Dracula, One Dark Pro, Github Dark, Obsidian Default & Nord.**
- **Seamless Integration:** Themes apply globally, styling everything from the Monaco editor and terminal down to the custom scrollbars.

### 🪟 Native UI & Resizable Layout
- **VS Code Style Menu Bar:** A fully functional, native-feeling top menu bar (File, Edit, Selection, View, Go, Run, Terminal, Help) with seamless hover-switching.
- **Fully Resizable Panes:** Every major section of the IDE is resizable. You can drag the boundaries between the File Explorer, Code Editor, Chat Panel, and Terminal to customize your workspace exactly how you like it.
- **Integrated Settings:** The "Mirage" logo in the top-left corner doubles as your settings toggle—keeping the UI clean and minimalist.

### 📁 Workspace Management
- **File Explorer:** A sleek, animated sidebar for browsing your workspace, opening files, and managing directories.
- **Context Menus:** Right-click on files/folders in the explorer for a beautifully animated glassmorphism context menu (New File, New Folder, Rename, Delete).
- **Integrated Terminal:** A built-in terminal (powered by xterm.js) for running build commands, git operations, and AI-proposed scripts.

---

## 🛠️ Tech Stack
- **Framework:** Electron + Vite
- **Frontend:** React 19, TypeScript
- **Styling:** TailwindCSS 4, Custom CSS Variables
- **Editor Core:** Monaco Editor (`@monaco-editor/react`)
- **Terminal:** Xterm.js (`@xterm/xterm`, `node-pty`)
- **State Management:** Zustand
- **Icons:** Lucide React
- **Markdown:** `react-markdown`, `react-syntax-highlighter`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v22+)
- npm

### Installation
1. Clone the repository and navigate to the project root:
   ```bash
   cd Mirage
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Building for Production
- Windows: `npm run build:win`
- macOS: `npm run build:mac`
- Linux: `npm run build:linux`

---

## 🧠 Architecture Overview
Mirage uses a standard IPC (Inter-Process Communication) model to bridge the Electron main process and the React renderer.
- **Main Process (`src/main/`):** Handles native OS dialogs, file system operations (`fs`), and spawning pseudo-terminals (`node-pty`).
- **Renderer Process (`src/renderer/`):** The React frontend where the `App.tsx` orchestrates the layout, `workspaceStore` manages open files and diff states, and `settingsStore` manages themes.
- **AI Integration:** The AI messages are intercepted by `ChatMessage.tsx`. Specialized regex parsers detect ````file:path```` and ````command```` blocks to render the interactive Diff and Command widgets instead of standard markdown text.
