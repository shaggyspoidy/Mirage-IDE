# Mirage IDE 💠

Mirage is a next-generation, agent-first Integrated Development Environment (IDE) built with Electron, React, TypeScript, and TailwindCSS. It goes beyond simple code completion by integrating an AI agent as a core pair-programming partner that proposes, stages, and contextualizes changes natively within your workflow.

## ✨ Key Features

### 🤖 Agent-First Architecture
- **Built-in AI Assistant:** A dedicated Chat Panel on the right provides seamless communication with your local Ollama models (e.g. `llama3`).
- **AI Git Auto-Commit:** A specialized "Sparkles" button in the Source Control panel instantly extracts your raw git diffs and streams a strictly-formatted, professional conventional commit message right into your IDE.
- **Pending Diff System:** When the AI proposes a code modification, it opens a side-by-side `Monaco DiffEditor` staging area. You can visually review the changes (deleted lines in red, added lines in green) and choose to **Accept** or **Reject** them.
- **Command Proposals:** The AI can propose terminal commands. These appear as interactive widgets in the chat. You remain in full control by clicking **"Run"** to execute them in the integrated terminal, ensuring no commands run without your explicit permission.

### 🎨 Advanced Theming Engine & Monaco Bridge
- **Dynamic CSS Variables:** A robust, fully dynamic theming system powered by CSS variables that restyles the entire application architecture on the fly.
- **10+ Curated Themes:** Ships with beautiful, Neovim-inspired aesthetics including:
  - **TokyoNight, Aura, Nightfox, Kanagawa, Rosé Pine, Cyberdream, Oxocarbon, Vague, and Moonfly.**
- **Monaco Theme Bridge:** When a theme is selected from the customized settings dropdown, a specialized bridge instantly recompiles Monaco's internal token colors (strings, keywords, variables, comments) to perfectly match the active CSS palette without reloading the window.

### ⌨️ Deep Vim Integration
- **Full Vim Emulation:** Native Vim keybindings integrated directly into the Monaco editor.
- **Sticky Mode Indicators:** A color-coded, sticky-note style floating UI instantly tells you what mode you're in (Normal = Green, Insert = Yellow, Visual = Purple, Command = Blue).
- **Command Mode UI:** Seamless transition into command-line mode (`:`) with a floating text input overlay that adapts to your active color scheme.

### 📁 Advanced Workspace & Git Management
- **File Explorer:** A sleek sidebar featuring dynamic `lucide-react` file icons (custom SVGs for `.ts`, `.json`, `.md`, images, and databases).
- **Drag-and-Drop:** Native HTML5 drag-and-drop mechanics. Drag any file into a folder to physically execute an IPC background `fs.rename` and move the file on your disk instantly.
- **Context Menus:** Right-click on files/folders in the explorer for a beautifully animated glassmorphism context menu (New File, New Folder, Rename, Delete).
- **Source Control:** Integrated Git tracking. View modified/added/deleted file icons, stage changes, push/pull from remotes, and use AI Auto-Commit all from one sidebar panel.

### 🪟 Native UI & Resizable Layout
- **VS Code Style Menu Bar:** A fully functional, native-feeling top menu bar (File, Edit, Selection, View, Go, Terminal, Help). Also features a convenient global **"Run"** button integrated into the title bar to execute your active script.
- **Fully Resizable Panes:** Every major section of the IDE is resizable. You can drag the boundaries between the File Explorer, Code Editor, Chat Panel, and Terminal to customize your workspace exactly how you like it.

---

## 🛠️ Tech Stack
- **Framework:** Electron + Vite
- **Frontend:** React 19, TypeScript
- **Styling:** TailwindCSS 4, Custom CSS Variables
- **Editor Core:** Monaco Editor (`@monaco-editor/react`)
- **Terminal:** Xterm.js (`@xterm/xterm`, `node-pty`)
- **AI Integration:** Local Ollama API Bridge
- **State Management:** Zustand
- **Icons:** Lucide React
- **Markdown:** `react-markdown`, `react-syntax-highlighter`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v22+)
- npm
- Ollama (installed locally for AI features)

### Installation
1. Clone the repository and navigate to the project root:
   ```bash
   git clone https://github.com/shaggyspoidy/Mirage-IDE.git
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
- **Main Process (`src/main/`):** Handles native OS dialogs, file system operations (`fs`), pseudo-terminals (`node-pty`), and Git parsing logic (`git diff HEAD`).
- **Renderer Process (`src/renderer/`):** The React frontend where the `App.tsx` orchestrates the layout, `workspaceStore` manages open files/diff states, and `modelStore` manages Ollama connections.
- **AI Integration:** The AI messages are intercepted by `ChatMessage.tsx`. Specialized regex parsers detect ````file:path```` and ````command```` blocks to render the interactive Diff and Command widgets instead of standard markdown text.
