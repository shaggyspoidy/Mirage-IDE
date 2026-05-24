import { DocItem } from './editor-shortcuts'

export const modelManagement: DocItem[] = [
  {
    title: 'Local Ollama Models',
    content: `
Mirage has built-in integration with Ollama for running models locally.
- Ensure the Ollama daemon is running in the background.
- Mirage will automatically detect installed models and list them in the Model Selector.
- Local models are processed entirely on your machine and do not require an internet connection.
    `
  },
  {
    title: '1-Click Model Installation',
    content: `
You can install new Ollama models directly from within Mirage:
1. Open the Model Selector dropdown in the top right.
2. Click **More Models...** at the bottom of the list.
3. Browse curated models or enter any valid Ollama model tag from the library.
4. Click **Install**. The download progress will stream directly in the UI.
    `
  },
  {
    title: 'Cloud API Proxies',
    content: `
Mirage supports leading cloud APIs: OpenAI (GPT-4o), Anthropic (Claude 3.5), and Google (Gemini 1.5).
- To use these models, you must provide your own API keys.
- Open **Settings (Ctrl+,)** and navigate to the **API Keys** tab.
- Your keys are encrypted locally using the OS native keychain (Windows DPAPI) via Electron's \`safeStorage\`. They are never stored in plaintext and never leave your machine except when calling the respective API provider.
    `
  }
]
