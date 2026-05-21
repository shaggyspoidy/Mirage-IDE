import type { ModelProvider } from '../../../shared/types/model'
import type { AiProviderClient } from './provider-interface'
import { AnthropicClient } from './anthropic-client'
import { GoogleClient } from './google-client'
import { OpenAIClient } from './openai-client'

class ProviderFactory {
  private anthropicClient = new AnthropicClient()
  private googleClient = new GoogleClient()
  private openaiClient = new OpenAIClient()

  getClient(provider: ModelProvider): AiProviderClient {
    switch (provider) {
      case 'anthropic':
        return this.anthropicClient
      case 'google':
        return this.googleClient
      case 'openai':
        return this.openaiClient
      case 'ollama':
        throw new Error('Ollama client is handled separately via OllamaService.')
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }
}

export const providerFactory = new ProviderFactory()
