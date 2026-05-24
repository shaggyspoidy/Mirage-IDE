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
  
  chatStream(
    modelName: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    onDone: (text: string) => void,
    onError: (error: string) => void
  ): Promise<void>

  stopStream(): void
}
