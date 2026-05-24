import { keyManager } from '../key-manager'
import type { AiProviderClient, ChatMessage, ChatResponse } from './provider-interface'

export class OpenAIClient implements AiProviderClient {
  private activeController: AbortController | null = null

  async chat(modelName: string, messages: ChatMessage[]): Promise<ChatResponse> {
    const key = await keyManager.getKey('openai')
    if (!key) throw new Error('OpenAI API key not configured.')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        stream: false
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
    }

    const data = await response.json()
    return {
      role: 'assistant',
      content: data.choices[0].message.content
    }
  }

  async chatStream(
    modelName: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    onDone: (text: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const key = await keyManager.getKey('openai')
    if (!key) {
      onError('OpenAI API key not configured.')
      return
    }

    this.stopStream()
    this.activeController = new AbortController()

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: true
        }),
        signal: this.activeController.signal
      })

      if (!response.ok) {
        const errorData = await response.text()
        if (response.status === 429 || response.status === 402) {
          throw new Error(`[RATE_LIMIT] OpenAI API error: ${response.status} ${errorData}`)
        }
        throw new Error(`OpenAI API error: ${response.status} ${errorData}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep the incomplete line in the buffer

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine.startsWith(':')) continue

          if (trimmedLine === 'data: [DONE]') {
            onDone(fullContent)
            return
          }

          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6)
            try {
              const data = JSON.parse(dataStr)
              const content = data.choices[0]?.delta?.content
              if (content) {
                fullContent += content
                onChunk(content)
              }
            } catch (e) {
              console.warn('Failed to parse SSE chunk:', dataStr)
            }
          }
        }
      }

      onDone(fullContent)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onError('Generation cancelled.')
      } else {
        onError(err.message || 'Unknown error occurred.')
      }
    } finally {
      this.activeController = null
    }
  }

  stopStream(): void {
    if (this.activeController) {
      this.activeController.abort()
      this.activeController = null
    }
  }
}
