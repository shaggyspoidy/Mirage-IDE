import { keyManager } from '../key-manager'
import type { AiProviderClient, ChatMessage, ChatResponse } from './provider-interface'

export class GoogleClient implements AiProviderClient {
  private activeController: AbortController | null = null

  async chat(modelName: string, messages: ChatMessage[]): Promise<ChatResponse> {
    const key = await keyManager.getKey('google')
    if (!key) throw new Error('Google API key not configured.')

    const systemMessage = messages.find((m) => m.role === 'system')?.content
    const userMessages = messages.filter((m) => m.role !== 'system')

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const body: any = { contents }
    if (systemMessage) {
      body.systemInstruction = {
        role: 'user',
        parts: [{ text: systemMessage }]
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Google API error: ${response.status} ${errorData}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return {
      role: 'assistant',
      content: text
    }
  }

  async chatStream(
    modelName: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    onDone: (text: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const key = await keyManager.getKey('google')
    if (!key) {
      onError('Google API key not configured.')
      return
    }

    this.stopStream()
    this.activeController = new AbortController()

    const systemMessage = messages.find((m) => m.role === 'system')?.content
    const userMessages = messages.filter((m) => m.role !== 'system')

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const body: any = { contents }
    if (systemMessage) {
      body.systemInstruction = {
        role: 'user',
        parts: [{ text: systemMessage }]
      }
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: this.activeController.signal
      })

      if (!response.ok) {
        const errorData = await response.text()
        if (response.status === 429 || response.status === 402) {
          throw new Error(`[RATE_LIMIT] Google API error: ${response.status} ${errorData}`)
        }
        throw new Error(`Google API error: ${response.status} ${errorData}`)
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
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text
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
