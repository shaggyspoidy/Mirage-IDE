/**
 * Model System Types — shared between main process and renderer.
 *
 * WHY in src/shared: This file is imported by both the main process
 * (src/main/services/) and the renderer (src/renderer/src/stores/).
 * Electron-vite uses separate TypeScript projects for each process.
 * Placing shared types in src/shared/ and including it in both
 * tsconfig.node.json and tsconfig.web.json avoids cross-project imports.
 */

// ─── App-Level Model Types ──────────────────────────────────────────────────

/**
 * Three-tier model classification:
 * - 'local': Installed Ollama models running on the user's machine
 * - 'cloud-api': Direct API models (OpenAI, Anthropic, Google) — requires API keys
 * - 'cloud-ollama': Cloud models proxied through Ollama's OpenAI-compatible endpoint
 */
export type ModelTier = 'local' | 'cloud-api' | 'cloud-ollama'

/**
 * Model provider identifier.
 * WHY separate from tier: A provider can serve models across multiple tiers.
 * For example, Ollama can proxy cloud models (tier: 'cloud-ollama', provider: 'ollama').
 */
export type ModelProvider = 'ollama' | 'openai' | 'anthropic' | 'google'

/**
 * Unified model descriptor — the canonical shape for all models regardless
 * of source. The renderer only ever sees ModelInfo objects.
 */
export interface ModelInfo {
  /** Unique identifier, e.g., 'ollama:llama3.2:latest' or 'openai:gpt-4o' */
  id: string
  /** Raw model name as returned by the provider, e.g., 'llama3.2:latest' */
  name: string
  /** Human-friendly display name, e.g., 'Llama 3.2' */
  displayName: string
  /** Which provider this model comes from */
  provider: ModelProvider
  /** Which tier this model belongs to */
  tier: ModelTier
  /** Parameter count string, e.g., '7B', '13B', '70B' */
  parameterSize?: string
  /** Maximum context window in tokens */
  contextWindow?: number
  /** Quantization level, e.g., 'Q4_K_M', 'Q8_0' */
  quantization?: string
  /** Whether the model is locally installed and ready to use */
  isInstalled: boolean
  /** Model file size in bytes (for local models) */
  sizeBytes?: number
  /** Model family, e.g., 'llama', 'gemma', 'qwen' */
  family?: string
}

/**
 * Ollama connection status as seen by the renderer.
 */
export interface OllamaStatus {
  running: boolean
  version: string | null
}

// ─── Ollama API Response Types ──────────────────────────────────────────────

/**
 * Model details returned by Ollama's /api/tags and /api/show endpoints.
 */
export interface OllamaModelDetails {
  parent_model: string
  format: string
  family: string
  families: string[]
  parameter_size: string
  quantization_level: string
}

/**
 * Single model entry from GET /api/tags.
 */
export interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: OllamaModelDetails
}

/**
 * Response shape from GET /api/tags.
 */
export interface OllamaTagsResponse {
  models: OllamaModel[]
}

/**
 * Chat message in Ollama's format.
 */
export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Request body for POST /api/chat.
 */
export interface OllamaChatRequest {
  model: string
  messages: OllamaChatMessage[]
  stream?: boolean
  options?: OllamaRequestOptions
}

/**
 * Generation options shared across /api/chat and /api/generate.
 */
export interface OllamaRequestOptions {
  temperature?: number
  top_p?: number
  top_k?: number
  num_ctx?: number
  num_predict?: number
  stop?: string[]
  seed?: number
}

/**
 * Streaming chunk from POST /api/chat (intermediate — more tokens coming).
 */
export interface OllamaChatStreamChunk {
  model: string
  created_at: string
  message: {
    role: 'assistant'
    content: string
  }
  done: false
}

/**
 * Final streaming chunk from POST /api/chat (includes performance metrics).
 */
export interface OllamaChatStreamDone {
  model: string
  created_at: string
  message: {
    role: 'assistant'
    content: ''
  }
  done: true
  done_reason: string
  total_duration: number
  load_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  eval_count: number
  eval_duration: number
}

export type OllamaChatStreamResponse = OllamaChatStreamChunk | OllamaChatStreamDone

/**
 * Response from GET /api/version.
 */
export interface OllamaVersionResponse {
  version: string
}

/**
 * Pull progress events from POST /api/pull (Phase 9 reference).
 */
export interface OllamaPullProgress {
  status: string
  digest?: string
  total?: number
  completed?: number
}
