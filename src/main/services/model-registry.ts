import type { OllamaModel } from '../../shared/types/model'
import type { ModelInfo, ModelTier, ModelProvider } from '../../shared/types/model'

/**
 * ModelRegistry — normalizes models from multiple sources into a unified list.
 *
 * WHY a registry: The app presents models from different sources (local Ollama,
 * cloud APIs, cloud-via-Ollama) in a single dropdown. Each source has its own
 * data shape. The registry transforms everything into ModelInfo[] so the
 * renderer doesn't need to know about source-specific formats.
 *
 * WHY hardcoded cloud models: Cloud API models (GPT-4o, Claude, Gemini) don't
 * come from any discovery API — we know them ahead of time. They're always
 * listed in the UI (greyed out until API keys are configured in Phase 7).
 */

/**
 * Transform a raw Ollama model name into a human-friendly display name.
 *
 * Examples:
 *   'llama3.2:latest'    → 'Llama 3.2'
 *   'codellama:13b'      → 'Code Llama 13B'
 *   'deepseek-r1:7b-q4'  → 'Deepseek R1'
 *   'qwen3:14b'          → 'Qwen 3'
 *
 * WHY: Raw Ollama names include tags and variants that clutter the UI.
 * The parameter size and quantization are shown as separate badges.
 */
function formatDisplayName(rawName: string): string {
  // Strip the tag (everything after ':')
  const baseName = rawName.split(':')[0]

  // Split on hyphens and dots, capitalize each segment
  return baseName
    .split(/[-.]/)
    .map((segment) => {
      // Keep version numbers as-is (e.g., '3', '3.2')
      if (/^\d/.test(segment)) return segment

      // Capitalize first letter
      return segment.charAt(0).toUpperCase() + segment.slice(1)
    })
    .join(' ')
}

/**
 * Convert an Ollama model (from /api/tags) into our unified ModelInfo format.
 */
function ollamaModelToModelInfo(model: OllamaModel): ModelInfo {
  return {
    id: `ollama:${model.name}`,
    name: model.name,
    displayName: formatDisplayName(model.name),
    provider: 'ollama' as ModelProvider,
    tier: 'local' as ModelTier,
    parameterSize: model.details?.parameter_size || undefined,
    quantization: model.details?.quantization_level || undefined,
    isInstalled: true,
    sizeBytes: model.size,
    family: model.details?.family || undefined
  }
}

/**
 * Hardcoded catalog of well-known cloud API models.
 *
 * WHY hardcoded: These models are always available (given an API key).
 * They don't come from a discovery API. The list is small and changes
 * infrequently — updating it requires a code change, which is acceptable
 * for an early-stage app.
 *
 * These will be enabled in Phase 7 when API key management is implemented.
 */
const CLOUD_API_MODELS: ModelInfo[] = [
  // OpenAI
  {
    id: 'openai:gpt-4o',
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    tier: 'cloud-api',
    parameterSize: 'Unknown',
    contextWindow: 128_000,
    isInstalled: false
  },
  {
    id: 'openai:gpt-4o-mini',
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'cloud-api',
    parameterSize: 'Unknown',
    contextWindow: 128_000,
    isInstalled: false
  },
  // Anthropic
  {
    id: 'anthropic:claude-sonnet',
    name: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    provider: 'anthropic',
    tier: 'cloud-api',
    parameterSize: 'Unknown',
    contextWindow: 200_000,
    isInstalled: false
  },
  {
    id: 'anthropic:claude-haiku',
    name: 'claude-haiku-3-20250514',
    displayName: 'Claude Haiku 3',
    provider: 'anthropic',
    tier: 'cloud-api',
    parameterSize: 'Unknown',
    contextWindow: 200_000,
    isInstalled: false
  },
  // Google
  {
    id: 'google:gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'cloud-api',
    parameterSize: 'Unknown',
    contextWindow: 1_000_000,
    isInstalled: false
  },
  {
    id: 'google:gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    provider: 'google',
    tier: 'cloud-api',
    parameterSize: 'Unknown',
    contextWindow: 1_000_000,
    isInstalled: false
  }
]

class ModelRegistry {
  private localModels: ModelInfo[] = []

  /**
   * Refresh the local model tier from a fresh Ollama /api/tags response.
   */
  refreshLocalModels(ollamaModels: OllamaModel[]): void {
    this.localModels = ollamaModels.map(ollamaModelToModelInfo)
  }

  /**
   * Get all models across all tiers, merged and deduplicated.
   *
   * WHY this order: Local models first (most relevant — already on machine),
   * then cloud API models (available but need keys), then cloud-via-Ollama.
   */
  getModels(): ModelInfo[] {
    return [...this.localModels, ...CLOUD_API_MODELS]
  }

  /**
   * Get models filtered by tier.
   */
  getModelsByTier(tier: ModelTier): ModelInfo[] {
    return this.getModels().filter((m) => m.tier === tier)
  }

  /**
   * Find a model by its unique ID.
   */
  getModelById(id: string): ModelInfo | undefined {
    return this.getModels().find((m) => m.id === id)
  }

  /**
   * Get just the local models count (useful for status display).
   */
  getLocalModelCount(): number {
    return this.localModels.length
  }
}

/**
 * Singleton instance.
 * WHY singleton: The registry is a shared data structure updated by the
 * Ollama polling service and read by the IPC handlers. A single instance
 * ensures consistent state.
 */
export const modelRegistry = new ModelRegistry()
