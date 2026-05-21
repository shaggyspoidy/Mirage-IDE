export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  role: 'assistant'
  content: string
}

export interface AiProviderClient {
  chat(modelName: string, messages: ChatMessage[]): Promise<ChatResponse>
}
