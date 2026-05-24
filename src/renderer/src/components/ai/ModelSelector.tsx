import { useState, useRef, useEffect } from 'react'
import { Code2, ChevronDown } from 'lucide-react'
import { useModelStore } from '../../stores/modelStore'
import { useSettingsStore } from '../../stores/settingsStore'
import type { ModelInfo } from '../../../../shared/types/model'

/**
 * ModelSelector — dropdown component for selecting AI models.
 *
 * WHY in the title bar: The model selector is a high-frequency interaction
 * during AI-assisted coding. Placing it in the title bar (like VS Code's
 * Copilot model picker) keeps it always visible and accessible without
 * navigating to a settings panel.
 *
 * DESIGN:
 * - Compact trigger button showing the selected model name
 * - Dropdown groups models by tier: Local, Cloud API, Cloud via Ollama
 * - Each row shows: name, parameter size badge, provider icon
 * - When Ollama is disconnected, Local tier shows a warning banner
 * - Cloud API models are locked (greyed out) until Phase 7
 * - Opening the dropdown triggers an immediate poll for freshness
 */

/** Provider display config */
const PROVIDER_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  ollama: { icon: '🦙', label: 'Ollama', color: 'var(--m-accent-green)' },
  openai: { icon: '⬡', label: 'OpenAI', color: 'var(--m-accent-teal)' },
  anthropic: { icon: '◈', label: 'Anthropic', color: 'var(--m-accent-peach)' },
  google: { icon: '◆', label: 'Google', color: 'var(--m-accent-blue)' }
}

/** Tier display config */
const TIER_CONFIG: Record<string, { icon: string; label: string }> = {
  local: { icon: '⚡', label: 'Local Models' },
  'cloud-api': { icon: '☁️', label: 'Cloud API' },
  'cloud-ollama': { icon: '🌐', label: 'Cloud via Ollama' }
}

/**
 * Format model file size into human-readable string.
 * e.g., 7365960935 → '6.9 GB'
 */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function ModelSelector(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const {
    models,
    selectedModelId,
    ollamaStatus,
    ollamaVersion,
    isPolling,
    pollModels,
    selectModel,
    setModelPanelOpen,
    initialize
  } = useModelStore()

  // Initialize store on mount (fetch models, subscribe to push events)
  useEffect(() => {
    const cleanup = initialize()
    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Poll for fresh models when dropdown opens
  const handleOpen = (): void => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      pollModels()
      setFocusedIndex(-1)
    }
  }

  // Group models by tier
  const localModels = models.filter((m) => m.tier === 'local')
  const cloudApiModels = models.filter((m) => m.tier === 'cloud-api')


  const selectableModels = [
    ...localModels.filter(() => ollamaStatus === 'connected'),
    ...cloudApiModels
  ]

  // Selected model info
  const selectedModel = models.find((m) => m.id === selectedModelId)

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        handleOpen()
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false)
        setFocusedIndex(-1)
        triggerRef.current?.focus()
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, selectableModels.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < selectableModels.length) {
          handleSelectModel(selectableModels[focusedIndex])
        }
        break
    }
  }

  const handleSelectModel = async (model: ModelInfo): Promise<void> => {
    if (model.tier === 'cloud-api') {
      const { fetchKeyStatus } = useSettingsStore.getState()
      // Ensure we have the latest status
      await fetchKeyStatus()
      const updatedStatus = useSettingsStore.getState().keyStatus
      
      if (!updatedStatus[model.provider]) {
        // Missing key! Close selector and open settings
        setIsOpen(false)
        useSettingsStore.setState({ isSettingsOpen: true })
        return
      }
    }

    selectModel(model.id)
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  return (
    <div ref={dropdownRef} className="relative flex items-center no-drag" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="h-[24px] px-1.5 flex items-center gap-1.5 rounded text-[11px] text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] transition-colors cursor-pointer bg-transparent border-none"
        aria-label="Select AI Model"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Code2 size={12} />
        
        {/* Selected model name or placeholder */}
        <span className="truncate max-w-[140px]">
          {selectedModel ? selectedModel.displayName : 'Agent'}
        </span>

        {/* Chevron */}
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1 w-[340px] rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--m-bg-surface)',
            borderColor: 'var(--m-border-primary)',
            boxShadow: 'var(--m-shadow-lg)',
            zIndex: 200,
            animation: 'modelSelectorFadeIn 0.15s ease-out'
          }}
          role="listbox"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: 'var(--m-border-primary)' }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--m-fg-muted)' }}
            >
              AI Models
            </span>
            <div className="flex items-center gap-2">
              {isPolling && (
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--m-accent-blue)' }}
                >
                  Refreshing…
                </span>
              )}
              {ollamaStatus === 'connected' && ollamaVersion && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--m-bg-overlay)',
                    color: 'var(--m-fg-muted)'
                  }}
                >
                  Ollama v{ollamaVersion}
                </span>
              )}
            </div>
          </div>

          {/* Scrollable model list */}
          <div className="max-h-[380px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {/* ── Local Models ────────────────────────────── */}
            <TierSection
              tier="local"
              models={localModels}
              ollamaStatus={ollamaStatus}
              selectedModelId={selectedModelId}
              focusedIndex={focusedIndex}
              selectableModels={selectableModels}
              onSelect={handleSelectModel}
            />

            {/* ── Cloud API Models ────────────────────────── */}
            <TierSection
              tier="cloud-api"
              models={cloudApiModels}
              ollamaStatus={ollamaStatus}
              selectedModelId={selectedModelId}
              focusedIndex={focusedIndex}
              selectableModels={selectableModels}
              onSelect={handleSelectModel}
            />

            {/* + More Models Button */}
            <button
              onClick={() => {
                setIsOpen(false)
                setModelPanelOpen(true)
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors duration-100 hover:bg-[var(--m-hover-bg)] border-t border-[var(--m-border-primary)]"
            >
              <div className="w-5 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--m-accent-blue)]">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              <span className="text-xs font-medium text-[var(--m-accent-blue)]">
                More Models...
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes modelSelectorFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

// ─── Tier Section Sub-Component ──────────────────────────────────────────────

interface TierSectionProps {
  tier: string
  models: ModelInfo[]
  ollamaStatus: string
  selectedModelId: string | null
  focusedIndex: number
  selectableModels: ModelInfo[]
  onSelect: (model: ModelInfo) => void
  locked?: boolean
}

function TierSection({
  tier,
  models,
  ollamaStatus,
  selectedModelId,
  focusedIndex,
  selectableModels,
  onSelect,
  locked = false
}: TierSectionProps): React.JSX.Element {
  const config = TIER_CONFIG[tier] || { icon: '📦', label: tier }

  return (
    <div>
      {/* Tier header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b"
        style={{
          backgroundColor: 'var(--m-bg-secondary)',
          borderColor: 'var(--m-border-primary)'
        }}
      >
        <span className="text-xs">{config.icon}</span>
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--m-fg-muted)' }}
        >
          {config.label}
        </span>
        <span
          className="text-[10px] ml-auto"
          style={{ color: 'var(--m-fg-subtle)' }}
        >
          {models.length}
        </span>
      </div>

      {/* Ollama disconnected warning for local tier */}
      {tier === 'local' && ollamaStatus === 'disconnected' && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 text-xs"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--m-accent-yellow) 8%, transparent)',
            color: 'var(--m-accent-yellow)',
            borderBottom: '1px solid var(--m-border-primary)'
          }}
        >
          <span className="text-sm">⚠</span>
          <div>
            <div className="font-medium">Ollama is not running</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--m-fg-muted)' }}>
              Start Ollama to use local models
            </div>
          </div>
        </div>
      )}

      {/* Checking status indicator */}
      {tier === 'local' && ollamaStatus === 'checking' && (
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs"
          style={{ color: 'var(--m-fg-muted)' }}
        >
          <span className="animate-pulse">●</span>
          Checking Ollama connection…
        </div>
      )}

      {/* No local models message */}
      {tier === 'local' && ollamaStatus === 'connected' && models.length === 0 && (
        <div
          className="px-3 py-2.5 text-xs"
          style={{ color: 'var(--m-fg-muted)' }}
        >
          <div>No models installed</div>
          <div className="text-[10px] mt-0.5">
            Run <code
              className="px-1 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: 'var(--m-bg-primary)',
                color: 'var(--m-accent-peach)'
              }}
            >ollama pull llama3.2</code> to get started
          </div>
        </div>
      )}

      {/* Model rows */}
      {models.map((model) => {
        const isSelected = model.id === selectedModelId
        const isDisabled =
          locked ||
          (tier === 'local' && ollamaStatus !== 'connected')
        const selectableIdx = selectableModels.findIndex((m) => m.id === model.id)
        const isFocused = selectableIdx === focusedIndex
        const providerCfg = PROVIDER_CONFIG[model.provider] || {
          icon: '?',
          label: model.provider,
          color: 'var(--m-fg-muted)'
        }

        return (
          <button
            key={model.id}
            onClick={() => !isDisabled && onSelect(model)}
            disabled={isDisabled}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 border-b last:border-b-0"
            style={{
              borderColor: 'var(--m-border-primary)',
              backgroundColor: isFocused
                ? 'var(--m-hover-bg)'
                : isSelected
                  ? 'color-mix(in srgb, var(--m-accent-blue) 10%, transparent)'
                  : 'transparent',
              opacity: isDisabled ? 0.45 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = isSelected
                  ? 'color-mix(in srgb, var(--m-accent-blue) 15%, transparent)'
                  : 'var(--m-hover-bg)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = isSelected
                  ? 'color-mix(in srgb, var(--m-accent-blue) 10%, transparent)'
                  : 'transparent'
              }
            }}
            role="option"
            aria-selected={isSelected}
          >
            {/* Provider icon */}
            <span className="text-sm w-5 text-center shrink-0">{providerCfg.icon}</span>

            {/* Model name + details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-medium truncate"
                  style={{
                    color: isSelected ? 'var(--m-accent-blue)' : 'var(--m-fg-primary)'
                  }}
                >
                  {model.displayName}
                </span>
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="shrink-0"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="var(--m-accent-blue)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Raw model name for local models */}
              {tier === 'local' && (
                <div
                  className="text-[10px] truncate mt-0.5"
                  style={{ color: 'var(--m-fg-subtle)' }}
                >
                  {model.name}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Parameter size badge */}
              {model.parameterSize && model.parameterSize !== 'Unknown' && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: 'var(--m-bg-overlay)',
                    color: 'var(--m-accent-purple)'
                  }}
                >
                  {model.parameterSize}
                </span>
              )}

              {/* Quantization badge (local models only) */}
              {model.quantization && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--m-bg-overlay)',
                    color: 'var(--m-fg-muted)'
                  }}
                >
                  {model.quantization}
                </span>
              )}

              {/* File size (local models only) */}
              {model.sizeBytes && (
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--m-fg-subtle)' }}
                >
                  {formatSize(model.sizeBytes)}
                </span>
              )}

              {/* Context window (cloud models) */}
              {model.contextWindow && tier === 'cloud-api' && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--m-bg-overlay)',
                    color: 'var(--m-fg-muted)'
                  }}
                >
                  {model.contextWindow >= 1_000_000
                    ? `${(model.contextWindow / 1_000_000).toFixed(0)}M ctx`
                    : `${(model.contextWindow / 1_000).toFixed(0)}K ctx`}
                </span>
              )}

              {/* Locked badge for cloud API models */}
              {locked && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--m-accent-yellow) 15%, transparent)',
                    color: 'var(--m-accent-yellow)'
                  }}
                >
                  🔒 Soon
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
