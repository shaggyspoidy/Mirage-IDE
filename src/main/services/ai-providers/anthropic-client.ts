import { keyManager } from '../key-manager'
import type { AiProviderClient, ChatMessage, ChatResponse } from './provider-interface'

export class AnthropicClient implements AiProviderClient {
  private activeController: AbortController | null = null

  async chat(modelName: string, messages: ChatMessage[]): Promise<ChatResponse> {
    const key = await keyManager.getKey('anthropic')
    if (!key) throw new Error('Anthropic API key not configured.')

    const systemMessage = messages.find((m) => m.role === 'system')?.content
    const userMessages = messages.filter((m) => m.role !== 'system')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: modelName,
        system: systemMessage,
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
        stream: false
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Anthropic API error: ${response.status} ${errorData}`)
    }

    const data = await response.json()
    return {
      role: 'assistant',
      content: data.content[0].text
    }
  }

  async chatStream(
    modelName: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    onDone: (text: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const key = await keyManager.getKey('anthropic')
    if (!key) {
      onError('Anthropic API key not configured.')
      return
    }

    this.stopStream()
    this.activeController = new AbortController()

    const systemMessage = messages.find((m) => m.role === 'system')?.content
    const userMessages = messages.filter((m) => m.role !== 'system')

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: modelName,
          system: systemMessage,
          messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: 4096,
          stream: true
        }),
        signal: this.activeController.signal
      })

      if (!response.ok) {
        const errorData = await response.text()
        if (response.status === 429 || response.status === 402) {
          throw new Error(`[RATE_LIMIT] Anthropic API error: ${response.status} ${errorData}`)
        }
        throw new Error(`Anthropic API error: ${response.status} ${errorData}`)
      }

      if (!response.body) throw new Error('Response body is null')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine.startsWith(':')) continue

          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6)
            try {
              const data = JSON.parse(dataStr)
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                const content = data.delta.text
                fullContent += content
                onChunk(content)
              } else if (data.type === 'message_stop') {
                onDone(fullContent)
                return
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
