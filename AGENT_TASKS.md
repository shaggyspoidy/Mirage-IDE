# AGENT_TASKS.md — Mirage Master Development Plan

> **MANDATORY RULE**: At the start of every subsequent prompt in this session, the AI must re-read this file, mark completed items with `[x]`, add any newly discovered sub-tasks, and confirm the current phase before proceeding with implementation.

---

## Phase 0: Repository Scaffold & Toolchain

**Goal**: Initialize the Electron + React + TypeScript project using electron-vite, configure linting/formatting, and establish the canonical directory structure.

**Files to create/modify**:
- `package.json` — project metadata, scripts, dependencies
- `electron.vite.config.ts` — electron-vite configuration
- `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json` — TypeScript configs
- `.eslintrc.cjs`, `.prettierrc` — linting and formatting
- `.gitignore`
- `src/main/index.ts` — main process entry (stub)
- `src/preload/index.ts` — preload script (stub)
- `src/renderer/index.html` — renderer entry HTML
- `src/renderer/src/main.tsx` — React entry point (stub)
- `src/renderer/src/App.tsx` — root App component (stub)
- `resources/` — directory for bundled assets (icons, portable nvim)

**Acceptance Criteria**:
- [x] `npm run dev` launches an Electron window with a blank React page
- [x] TypeScript compiles with zero errors
- [x] ESLint and Prettier run without errors on all source files
- [x] Directory structure matches the canonical layout below

**Canonical Directory Structure**:
```
mirage/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # Entry point
│   │   ├── ipc/               # IPC handler modules
│   │   ├── services/          # Main-process services (ollama, pty, ai-providers)
│   │   └── utils/             # Main-process utilities
│   ├── preload/
│   │   └── index.ts           # Context bridge expositions
│   └── renderer/
│       └── src/
│           ├── main.tsx        # React entry
│           ├── App.tsx         # Root component
│           ├── components/     # React components
│           ├── stores/         # Zustand stores
│           ├── hooks/          # Custom React hooks
│           ├── themes/         # CSS variable theme files
│           ├── types/          # Shared TypeScript types
│           └── assets/         # Static assets (fonts, images)
├── resources/                  # Bundled binaries, icons
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
└── AGENT_TASKS.md
```

**Risks**: electron-vite template may differ across versions; pin the version.

---

## Phase 1: Electron Main Process Skeleton

**Goal**: Build the main process foundation — BrowserWindow creation, IPC channel registry pattern, node-pty integration, and nvim process lifecycle management.

**Files to create/modify**:
- `src/main/index.ts` — BrowserWindow setup (frameless), app lifecycle
- `src/main/ipc/registry.ts` — centralized IPC channel registration
- `src/main/ipc/terminal.ts` — `terminal:write`, `terminal:data`, `terminal:resize`, `terminal:spawn`, `terminal:kill` handlers
- `src/main/services/pty-manager.ts` — node-pty spawn/resize/kill wrapper
- `src/main/services/nvim-detector.ts` — locate nvim on `$PATH` or fallback to `resources/nvim`
- `src/preload/index.ts` — contextBridge API for terminal channels
- `postinstall.js` or `scripts/rebuild-native.js` — electron-rebuild for node-pty

**Dependencies to install**: `node-pty`, `@electron/rebuild`

**Acceptance Criteria**:
- [ ] `node-pty` rebuilds successfully against Electron's Node ABI via postinstall
- [ ] Main process spawns a pty running `nvim` (or system shell fallback)
- [ ] IPC channels `terminal:spawn`, `terminal:write`, `terminal:data`, `terminal:resize`, `terminal:kill` are registered and functional
- [ ] nvim process is detected on PATH or fallback path is used
- [ ] App gracefully handles missing nvim (logs warning, falls back to shell)

**Risks**: `node-pty` native compilation failures on Windows — requires Visual Studio Build Tools. Document in README.

**Depends on**: Phase 0

---

## Phase 2: xterm.js Renderer Integration

**Goal**: Render a fully functional terminal pane using xterm.js in the React renderer, wired to the main-process pty via IPC. Implement Standard/LazyVim mode toggle.

**Files to create/modify**:
- `src/renderer/src/components/terminal/TerminalPane.tsx` — xterm.js React wrapper
- `src/renderer/src/components/terminal/useTerminal.ts` — hook managing xterm lifecycle, IPC data flow, resize observer
- `src/renderer/src/components/editor/StandardEditor.tsx` — placeholder for Standard Text Mode (textarea/CodeMirror stub)
- `src/renderer/src/components/editor/EditorContainer.tsx` — orchestrates mode toggle, renders TerminalPane or StandardEditor
- `src/renderer/src/stores/editorStore.ts` — Zustand slice for `editorMode: 'standard' | 'lazyvim'`

**Dependencies to install**: `xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`

**Acceptance Criteria**:
- [ ] xterm.js renders in the React app and displays a working terminal
- [ ] Keystrokes in xterm reach nvim via IPC; nvim output renders in xterm
- [ ] Window resize triggers `FitAddon.fit()` → IPC `terminal:resize` → `pty.resize()`
- [ ] Toggle button switches between Standard and LazyVim mode without killing the nvim/pty process
- [ ] xterm pane is hidden (not destroyed) when in Standard mode; pty stays alive

**Risks**: xterm.js sizing glitches if `FitAddon` runs before the DOM element is measured. Use `requestAnimationFrame` guard.

**Depends on**: Phase 1

---

## Phase 3: LazyVim First-Run Bootstrap

**Goal**: Detect Neovim installation and LazyVim config state on first run. Offer to bootstrap LazyVim starter config if missing.

**Files to create/modify**:
- `src/main/services/lazyvim-bootstrap.ts` — check `%APPDATA%/nvim/` for LazyVim markers (`lazy-lock.json`), clone starter if missing
- `src/main/ipc/bootstrap.ts` — IPC handlers: `bootstrap:check-status`, `bootstrap:install-lazyvim`
- `src/preload/index.ts` — expose bootstrap channels
- `src/renderer/src/components/onboarding/FirstRunDialog.tsx` — modal showing Neovim/LazyVim status with install button
- `src/renderer/src/components/onboarding/HealthCheck.tsx` — displays nvim version, LazyVim status, node-pty status

**Acceptance Criteria**:
- [ ] On first launch, app detects whether nvim is installed and reports version
- [ ] App detects whether `%APPDATA%/nvim/lazy-lock.json` exists
- [ ] If LazyVim config is missing, a modal offers to clone the LazyVim starter repo
- [ ] Clone progress is streamed to the UI via IPC
- [ ] After bootstrap, the terminal pane launches nvim with working LazyVim

**Risks**: Git must be available for cloning. Detect git availability and show a helpful error if missing.

**Depends on**: Phase 1, Phase 2

---

## Phase 4: Theming System

**Goal**: Implement a CSS-variable-based theming system with four themes (Catppuccin Mocha, Dark, Light, Cyberpunk). No hard-coded colors in components.

**Files to create/modify**:
- `src/renderer/src/themes/variables.css` — CSS custom property schema (all color tokens)
- `src/renderer/src/themes/catppuccin-mocha.css` — Catppuccin Mocha values
- `src/renderer/src/themes/dark.css` — Dark theme values
- `src/renderer/src/themes/light.css` — Light theme values
- `src/renderer/src/themes/cyberpunk.css` — Cyberpunk neon theme values
- `tailwind.config.ts` — extend Tailwind to reference CSS variables
- `src/renderer/src/stores/themeStore.ts` — Zustand slice for active theme, persisted to localStorage
- `src/renderer/src/components/settings/ThemeSwitcher.tsx` — theme selector component
- `src/renderer/src/hooks/useTheme.ts` — hook to apply theme class to `<html>`

**Acceptance Criteria**:
- [ ] All four themes render correctly with distinct visual identities
- [ ] Switching themes updates all UI elements instantly (no page reload)
- [ ] Theme preference persists across app restarts (localStorage)
- [ ] xterm.js terminal colors update to match the active theme
- [ ] Zero hard-coded color values exist in any component file
- [ ] Tailwind classes reference CSS variables exclusively for colors

**Risks**: xterm.js has its own theme object — must sync it with CSS variables programmatically.

**Depends on**: Phase 0

---

## Phase 5: Custom Title Bar & Frameless Window

**Goal**: Replace native OS chrome with a custom title bar featuring window controls and the editor mode toggle.

**Files to create/modify**:
- `src/main/index.ts` — set `frame: false`, `titleBarStyle: 'hidden'` in BrowserWindow options
- `src/main/ipc/window.ts` — IPC handlers: `window:minimize`, `window:maximize`, `window:close`, `window:is-maximized`
- `src/preload/index.ts` — expose window control channels
- `src/renderer/src/components/titlebar/TitleBar.tsx` — custom title bar component
- `src/renderer/src/components/titlebar/WindowControls.tsx` — minimize/maximize/close buttons (right side)
- `src/renderer/src/components/titlebar/ModeToggle.tsx` — Standard/LazyVim toggle (left side)
- `src/renderer/src/components/titlebar/titlebar.css` — `-webkit-app-region: drag` styles

**Acceptance Criteria**:
- [ ] Native title bar is hidden; custom title bar renders at the top
- [ ] Window is draggable via the title bar region
- [ ] Minimize, Maximize/Restore, Close buttons work correctly
- [ ] Maximize button icon toggles between maximize and restore states
- [ ] Mode toggle button on the left switches editor mode (wired to Phase 2 store)
- [ ] Double-click on drag region toggles maximize/restore

**Depends on**: Phase 2, Phase 4

---

## Phase 6: AI Engine — Ollama Polling & Model Registry

**Goal**: Build the main-process Ollama polling service, three-tier model registry, and model selector UI in the renderer.

**Files to create/modify**:
- `src/main/services/ollama-service.ts` — HTTP client for Ollama API (`/api/tags`, `/api/generate`, `/api/chat`), polling loop (30s background, 500ms on focus)
- `src/main/services/model-registry.ts` — normalizes models into three tiers: local-only, cloud-via-api, cloud-via-ollama
- `src/main/ipc/ai.ts` — IPC handlers: `ai:get-models`, `ai:poll-models`, `ai:select-model`
- `src/preload/index.ts` — expose AI channels
- `src/renderer/src/components/ai/ModelSelector.tsx` — dropdown grouped by tier, provider badges, context window sizes
- `src/renderer/src/stores/modelStore.ts` — Zustand slice for model list, selected model, Ollama connection status
- `src/renderer/src/types/model.ts` — `ModelInfo`, `ModelTier`, `ModelProvider` type definitions

**Acceptance Criteria**:
- [ ] Background poll every 30s fetches Ollama `/api/tags` and updates model store
- [ ] High-frequency poll (debounced 500ms) triggers when model dropdown is focused
- [ ] Models are correctly categorized into Local / Cloud API / Cloud-via-Ollama tiers
- [ ] Cloud-via-Ollama models show an "Ollama-proxied" badge
- [ ] If Ollama is not running, Local and Cloud-via-Ollama groups are greyed out with "Start Ollama" prompt
- [ ] Cloud API models remain accessible regardless of Ollama status
- [ ] All HTTP calls to Ollama happen in main process only — never from renderer

**Risks**: Ollama API response format may vary across versions. Pin expected schema and validate responses.

**Depends on**: Phase 0, Phase 4

---

## Phase 7: Cloud API Proxy Layer & Key Management

**Goal**: Implement cloud AI provider clients (Anthropic, Google, OpenAI) in the main process with encrypted API key storage via safeStorage.

**Files to create/modify**:
- `src/main/services/ai-providers/anthropic-client.ts` — Claude Sonnet/Opus streaming client
- `src/main/services/ai-providers/google-client.ts` — Gemini Pro/Flash streaming client
- `src/main/services/ai-providers/openai-client.ts` — GPT-4o/4o-mini streaming client
- `src/main/services/ai-providers/provider-factory.ts` — factory returning correct client by model ID
- `src/main/services/key-manager.ts` — encrypt/decrypt API keys via `safeStorage`, store in `userData/keys.json`
- `src/main/ipc/settings.ts` — IPC handlers: `settings:save-key`, `settings:get-key-status`, `settings:delete-key`
- `src/main/ipc/ai.ts` — add `ai:chat` handler (stream tokens back via IPC)
- `src/preload/index.ts` — expose settings channels
- `src/renderer/src/components/settings/SettingsPanel.tsx` — tabbed settings panel
- `src/renderer/src/components/settings/ApiKeyForm.tsx` — per-provider key input with validation
- `src/renderer/src/stores/settingsStore.ts` — Zustand slice for key status per provider

**Acceptance Criteria**:
- [ ] API keys are encrypted via `safeStorage.encryptString()` and stored in `userData`
- [ ] Keys are never exposed to the renderer process — renderer only sees status (set/unset)
- [ ] `ai:chat` IPC handler accepts `{modelId, messages}`, routes to correct provider, streams tokens back
- [ ] All three providers (Anthropic, Google, OpenAI) successfully complete a chat round-trip
- [ ] Settings panel allows entering, updating, and deleting keys per provider
- [ ] Invalid keys are detected on first use and reported to the UI

**Risks**: `safeStorage` may not be available on all Windows configurations (requires DPAPI). Add fallback warning.

**Depends on**: Phase 6

---

## Phase 8: Context Engine (Zustand Store)

**Goal**: Build the unified Zustand store that all AI providers share — conversation history, active file context, cross-provider continuity.

**Files to create/modify**:
- `src/renderer/src/stores/contextStore.ts` — main Context Engine store: conversations, active file, AI output
- `src/renderer/src/types/conversation.ts` — `Message`, `Conversation`, `ConversationSession` types
- `src/renderer/src/components/ai/ChatPanel.tsx` — AI chat panel with message history
- `src/renderer/src/components/ai/ChatMessage.tsx` — individual message bubble (user/assistant, model badge)
- `src/renderer/src/components/ai/ChatInput.tsx` — prompt input with send button
- `src/renderer/src/hooks/useActiveFile.ts` — hook syncing active file content to context store
- `src/renderer/src/stores/contextStore.ts` — middleware for persisting conversation history

**Acceptance Criteria**:
- [ ] Conversation history is maintained across model switches within a session
- [ ] Switching from Claude to Qwen mid-conversation preserves full prior context
- [ ] Active file content is available in the context store for AI prompts
- [ ] Chat panel renders message history with model badges per message
- [ ] AI responses stream token-by-token into the chat panel
- [ ] Conversation history is persisted to disk and restored on app restart

**Depends on**: Phase 6, Phase 7

---

## Phase 9: 1-Click Model Install

**Goal**: Allow users to install missing Ollama models directly from the model selector with streamed progress.

**Files to create/modify**:
- `src/main/services/ollama-service.ts` — add `pullModel(modelName)` method using `child_process.spawn('ollama', ['pull', modelName])`
- `src/main/ipc/ai.ts` — add `ai:install-model` handler, stream stdout progress via IPC event
- `src/preload/index.ts` — expose `ai:install-model` and `ai:install-progress` channels
- `src/renderer/src/components/ai/ModelInstallButton.tsx` — install button with progress bar
- `src/renderer/src/components/ai/ModelSelector.tsx` — integrate install button for uninstalled models

**Acceptance Criteria**:
- [ ] Selecting an uninstalled local model shows an "Install" button
- [ ] Clicking install triggers `ollama pull <model>` in the main process
- [ ] Pull progress (percentage, download speed) streams to the renderer in real-time
- [ ] On completion, the model appears in the Local tier without requiring a manual refresh
- [ ] Errors (network failure, invalid model name) are displayed in the UI
- [ ] Concurrent installs are queued or blocked with a clear UI indicator

**Depends on**: Phase 6

---

## Phase 10: Documentation Tab

**Goal**: Build a dedicated Help/Documentation tab with structured content covering Vim motions, Neovim concepts, and LazyVim workflows.

**Files to create/modify**:
- `src/renderer/src/components/docs/DocumentationPanel.tsx` — main docs layout with sidebar navigation
- `src/renderer/src/components/docs/DocSection.tsx` — reusable section renderer (markdown or structured JSX)
- `src/renderer/src/components/docs/content/vim-motions.ts` — Vim motions reference content
- `src/renderer/src/components/docs/content/neovim-concepts.ts` — Neovim-specific concepts
- `src/renderer/src/components/docs/content/lazyvim-workflows.ts` — LazyVim keybindings, plugin management
- `src/renderer/src/components/docs/content/mirage-features.ts` — Mirage-specific features (AI, themes, etc.)
- `src/renderer/src/components/docs/SearchDocs.tsx` — search/filter within documentation

**Acceptance Criteria**:
- [ ] Documentation tab is accessible from the main navigation
- [ ] Content covers: basic Vim motions, modes, Neovim buffers/windows/tabs, LazyVim keymaps, plugin usage
- [ ] Sidebar navigation allows jumping between sections
- [ ] Search/filter narrows visible content
- [ ] Content is structured for users coming from GUI editors (progressive complexity)
- [ ] Documentation renders correctly in all four themes

**Depends on**: Phase 4, Phase 5

---

## Phase 11: Packaging & Distribution

**Goal**: Configure electron-builder for Windows packaging (NSIS installer + portable) and scaffold auto-update.

**Files to create/modify**:
- `electron-builder.yml` — NSIS installer config, portable target, file associations
- `package.json` — add `build` scripts, `electron-builder` config
- `scripts/bundle-nvim.js` — script to download and bundle portable Neovim into `resources/`
- `src/main/services/auto-updater.ts` — electron-updater scaffold (GitHub Releases provider)
- `resources/icon.ico` — application icon (Windows ICO format)
- `LICENSE` — open-source license file
- `README.md` — project documentation, build instructions, contributing guide

**Acceptance Criteria**:
- [ ] `npm run build` produces a working NSIS installer for Windows
- [ ] `npm run build:portable` produces a portable executable
- [ ] Installer bundles portable Neovim if configured
- [ ] App icon displays correctly in taskbar, title bar, and installer
- [ ] Auto-updater scaffold is in place (checks GitHub Releases on launch)
- [ ] README includes: prerequisites, build instructions, architecture overview

**Risks**: Code signing requires a certificate. Document as optional for open-source distribution.

**Depends on**: All prior phases

---

## Phase 12: Testing & Hardening

**Goal**: Comprehensive test coverage for critical paths — IPC handlers, Ollama polling, error boundaries, and integration tests.

**Files to create/modify**:
- `vitest.config.ts` — test configuration
- `src/main/__tests__/ipc-terminal.test.ts` — unit tests for terminal IPC handlers
- `src/main/__tests__/ipc-ai.test.ts` — unit tests for AI IPC handlers
- `src/main/__tests__/ollama-service.test.ts` — integration tests for Ollama polling (mocked HTTP)
- `src/main/__tests__/key-manager.test.ts` — unit tests for key encryption/decryption
- `src/main/__tests__/model-registry.test.ts` — unit tests for three-tier model categorization
- `src/renderer/src/__tests__/ModelSelector.test.tsx` — component tests
- `src/renderer/src/__tests__/ChatPanel.test.tsx` — component tests
- `src/renderer/src/__tests__/contextStore.test.ts` — Zustand store tests
- `src/renderer/src/components/ErrorBoundary.tsx` — global React error boundary

**Acceptance Criteria**:
- [ ] All IPC handlers have unit tests with mocked Electron APIs
- [ ] Ollama polling service has integration tests with mocked HTTP responses
- [ ] Model registry correctly categorizes models in all edge cases
- [ ] Key manager encrypts/decrypts round-trip correctly
- [ ] React error boundary catches and displays component errors gracefully
- [ ] `npm test` runs all tests with zero failures
- [ ] Code coverage report is generated (target: >70% on critical paths)

**Depends on**: All prior phases

---

## Summary & Dependency Graph

```
Phase 0 (Scaffold)
  ├── Phase 1 (Main Process + node-pty)
  │     ├── Phase 2 (xterm.js Renderer)
  │     │     ├── Phase 3 (LazyVim Bootstrap)
  │     │     └── Phase 5 (Title Bar) ← also needs Phase 4
  │     └── Phase 6 (Ollama Polling + Model Registry)
  │           ├── Phase 7 (Cloud API Proxy)
  │           │     └── Phase 8 (Context Engine)
  │           └── Phase 9 (1-Click Install)
  ├── Phase 4 (Theming)
  │     ├── Phase 5 (Title Bar)
  │     ├── Phase 6 (Model Selector UI)
  │     └── Phase 10 (Documentation)
  └── Phase 11 (Packaging) ← all phases
        └── Phase 12 (Testing) ← all phases
```
