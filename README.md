# Mirage-IDE

> An agent-first desktop code editor built with Electron, React, and Monaco.

![GitHub stars](https://img.shields.io/github/stars/shaggyspoidy/Mirage-IDE?style=for-the-badge&logo=github) ![GitHub forks](https://img.shields.io/github/forks/shaggyspoidy/Mirage-IDE?style=for-the-badge&logo=github) ![GitHub issues](https://img.shields.io/github/issues/shaggyspoidy/Mirage-IDE?style=for-the-badge&logo=github) ![Last commit](https://img.shields.io/github/last-commit/shaggyspoidy/Mirage-IDE?style=for-the-badge&logo=github) ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

## 📑 Table of Contents

- [Description](#description)
- [Key Features](#key-features)
- [Use Cases](#use-cases)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Key Dependencies](#key-dependencies)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Contributing](#contributing)
- [License](#license)

## 📝 Description

Mirage-IDE is an agent-first desktop Integrated Development Environment (IDE) designed to streamline developer workflows by hosting an AI assistant directly alongside the editor. Built with Electron, React, TypeScript, and Tailwind CSS, it addresses the friction of context-switching by embedding a dedicated chat panel and terminal-command proposals directly within the editing interface, ensuring developers remain in full control of their workspace.

## ✨ Key Features

- **🤖 Local AI Assistant Integration** — Interact with local Ollama models directly through a dedicated side-panel chat interface.
- **🔄 Side-by-Side Monaco Diff Editor** — Review and audit AI-proposed code modifications line-by-line before choosing to accept or reject them.
- **💻 Interactive Terminal Command Proposals** — Review and execute AI-suggested shell commands directly inside the integrated terminal with explicit confirmation.
- **✨ Automated Conventional Git Commits** — Analyze your current raw git diffs and instantly generate structured conventional commit messages with a dedicated action button.
- **🎨 Dynamic Monaco Theme Bridge** — Recompile Monaco code colors on the fly using dynamic CSS variables matching 10+ Neovim-inspired themes.
- **⌨️ Native Vim Emulation Support** — Edit code with traditional modal editing capabilities via built-in Vim keybindings.

## 🎯 Use Cases

- Developing software locally with real-time assistance from self-hosted Ollama language models.
- Reviewing, staging, and accepting AI-generated code modifications through a side-by-side visual diff interface.
- Drafting precise conventional git commit messages automatically generated from raw file differences.
- Coding in a customizable desktop editor featuring extensive Vim-modal controls and dynamic aesthetic themes.

## 🛠️ Tech Stack

- 🔌 **Electron**
- ⚛️ **React**
- 🌬️ **Tailwind CSS**
- 📘 **TypeScript**
- ⚡ **Vite**

**Notable libraries:** Zustand

## ⚡ Quick Start

```bash

# 1. Clone the repository
git clone https://github.com/shaggyspoidy/Mirage-IDE.git

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run start
```

## 📦 Key Dependencies

```
@electron-toolkit/preload: ^3.0.2
@electron-toolkit/utils: ^4.0.0
@monaco-editor/react: ^4.7.0
@types/react-syntax-highlighter: ^15.5.13
@xterm/addon-fit: ^0.11.0
@xterm/xterm: ^6.0.0
lucide-react: ^1.16.0
monaco-vim: ^0.4.4
node-pty: ^1.1.0
react-markdown: ^10.1.0
react-syntax-highlighter: ^16.1.1
remark-gfm: ^4.0.1
xterm: ^5.3.0
zustand: ^5.0.13
```

## 🚀 Available Scripts

- **format** — `npm run format`
- **lint** — `npm run lint`
- **typecheck:node** — `npm run typecheck:node`
- **typecheck:web** — `npm run typecheck:web`
- **typecheck** — `npm run typecheck`
- **start** — `npm run start`
- **dev** — `npm run dev`
- **build** — `npm run build`
- **postinstall** — `npm run postinstall`
- **build:unpack** — `npm run build:unpack`
- **build:win** — `npm run build:win`
- **build:mac** — `npm run build:mac`
- **build:linux** — `npm run build:linux`

## 📁 Project Structure

```
.
├── AGENT_TASKS.md
├── LICENSE
├── electron-builder.yml
├── electron.vite.config.ts
├── eslint.config.mjs
├── package.json
├── remove_bg.py
├── resources
│   └── icon.png
├── src
│   ├── main
│   │   ├── index.ts
│   │   ├── ipc
│   │   │   ├── ai.ts
│   │   │   ├── dialog.ts
│   │   │   ├── fs.ts
│   │   │   ├── registry.ts
│   │   │   ├── settings.ts
│   │   │   ├── terminal.ts
│   │   │   └── window.ts
│   │   └── services
│   │       ├── ai-providers
│   │       │   ├── anthropic-client.ts
│   │       │   ├── google-client.ts
│   │       │   ├── openai-client.ts
│   │       │   ├── provider-factory.ts
│   │       │   └── provider-interface.ts
│   │       ├── key-manager.ts
│   │       ├── model-registry.ts
│   │       ├── ollama-service.ts
│   │       ├── pty-manager.ts
│   │       └── vscode-importer.ts
│   ├── preload
│   │   ├── index.d.ts
│   │   └── index.ts
│   ├── renderer
│   │   ├── index.html
│   │   └── src
│   │       ├── App.tsx
│   │       ├── assets
│   │       │   ├── base.css
│   │       │   ├── electron.svg
│   │       │   ├── fonts
│   │       │   │   └── ...
│   │       │   ├── logo-dark.png
│   │       │   ├── logo-light.png
│   │       │   ├── logo.png
│   │       │   ├── main.css
│   │       │   └── wavy-lines.svg
│   │       ├── components
│   │       │   ├── Versions.tsx
│   │       │   ├── ai
│   │       │   │   └── ...
│   │       │   ├── command
│   │       │   │   └── ...
│   │       │   ├── docs
│   │       │   │   └── ...
│   │       │   ├── editor
│   │       │   │   └── ...
│   │       │   ├── search
│   │       │   │   └── ...
│   │       │   ├── settings
│   │       │   │   └── ...
│   │       │   ├── sidebar
│   │       │   │   └── ...
│   │       │   ├── statusbar
│   │       │   │   └── ...
│   │       │   ├── terminal
│   │       │   │   └── ...
│   │       │   └── titlebar
│   │       │       └── ...
│   │       ├── env.d.ts
│   │       ├── hooks
│   │       │   └── useTheme.ts
│   │       ├── index.css
│   │       ├── main.tsx
│   │       ├── stores
│   │       │   ├── contextStore.ts
│   │       │   ├── modelStore.ts
│   │       │   ├── settingsStore.ts
│   │       │   ├── themeStore.ts
│   │       │   └── workspaceStore.ts
│   │       ├── themes
│   │       │   ├── aura.css
│   │       │   ├── catppuccin-mocha.css
│   │       │   ├── cyberdream.css
│   │       │   ├── cyberpunk.css
│   │       │   ├── dark.css
│   │       │   ├── dracula.css
│   │       │   ├── github-dark.css
│   │       │   ├── kanagawa.css
│   │       │   ├── light.css
│   │       │   ├── moonfly.css
│   │       │   ├── nightfox.css
│   │       │   ├── obsidian-default.css
│   │       │   ├── obsidian-nord.css
│   │       │   ├── one-dark-pro.css
│   │       │   ├── oxocarbon.css
│   │       │   ├── rose-pine.css
│   │       │   ├── tokyonight.css
│   │       │   ├── vague.css
│   │       │   └── variables.css
│   │       └── utils
│   │           └── themeToMonaco.ts
│   └── shared
│       └── types
│           └── model.ts
├── tsconfig.json
├── tsconfig.node.json
└── tsconfig.web.json
```

## 🛠️ Development Setup

### Node.js / JavaScript
1. Install Node.js (v18+ recommended)
2. Install dependencies: `npm install` (or `yarn` / `pnpm install` / `bun install`)
3. Start the dev server: see the **Quick Start** above

## 👥 Contributing

Contributions are welcome! Here's the standard flow:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/shaggyspoidy/Mirage-IDE.git`
3. **Branch**: `git checkout -b feature/your-feature`
4. **Commit**: `git commit -m 'feat: add some feature'`
5. **Push**: `git push origin feature/your-feature`
6. **Open** a pull request

Please follow the existing code style and include tests for new behavior where applicable.

## 📜 License

This project is licensed under the **MIT** License.
---
