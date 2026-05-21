import { keyManager } from '../key-manager'
import type { AiProviderClient, ChatMessage, ChatResponse } from './provider-interface'

export class OpenAIClient implements AiProviderClient {
  async chat(modelName: string, messages: ChatMessage[]): Promise<ChatResponse> {
    const key = await keyManager.getKey('openai')
    if (!key) throw new Error('OpenAI API key not configured.')

    console.log(`[OpenAI] Chat request to ${modelName} with ${messages.length} messages.`)
    
    // Stub implementation for Phase 7. Streaming will be added in Phase 8.
    return {
      role: 'assistant',
      content: 'OpenAI integration stub. Real streaming coming in Phase 8.'
    }
  }
}
