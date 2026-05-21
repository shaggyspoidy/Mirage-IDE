import { keyManager } from '../key-manager'
import type { AiProviderClient, ChatMessage, ChatResponse } from './provider-interface'

export class AnthropicClient implements AiProviderClient {
  async chat(modelName: string, messages: ChatMessage[]): Promise<ChatResponse> {
    const key = await keyManager.getKey('anthropic')
    if (!key) throw new Error('Anthropic API key not configured.')

    console.log(`[Anthropic] Chat request to ${modelName} with ${messages.length} messages.`)
    
    // Stub implementation for Phase 7. Streaming will be added in Phase 8.
    return {
      role: 'assistant',
      content: 'Anthropic integration stub. Real streaming coming in Phase 8.'
    }
  }
}
