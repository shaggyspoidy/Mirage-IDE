import { useState } from 'react'
import { X, Download, Terminal, Loader2 } from 'lucide-react'
import { useModelStore } from '../../stores/modelStore'

const POPULAR_MODELS = [
  {
    id: 'llama3',
    name: 'Llama 3 (8B)',
    description: 'Meta\'s latest highly capable open model. Great for general coding and chat.',
    command: 'ollama pull llama3'
  },
  {
    id: 'qwen2.5-coder',
    name: 'Qwen 2.5 Coder (7B)',
    description: 'Specialized coding model from Alibaba. Excellent at code generation.',
    command: 'ollama pull qwen2.5-coder'
  },
  {
    id: 'phi3',
    name: 'Phi-3 Mini (3.8B)',
    description: 'Microsoft\'s lightweight model. Very fast and uses minimal RAM.',
    command: 'ollama pull phi3'
  },
  {
    id: 'mistral',
    name: 'Mistral (7B)',
    description: 'Fast, high-performance open model by Mistral AI.',
    command: 'ollama pull mistral'
  }
]

export function MoreModelsPanel(): React.JSX.Element | null {
  const { isModelPanelOpen, setModelPanelOpen, pollModels } = useModelStore()
  const [installing, setInstalling] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [customModel, setCustomModel] = useState('')

  if (!isModelPanelOpen) return null

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command)
    setCopied(command)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleInstall = async (modelId: string) => {
    setInstalling(modelId)
    try {
      // We will send this to the main process to execute
      // If we haven't wired this up yet, it'll just simulate a delay or fail gracefully
      if (window.api && window.api.ai && window.api.ai.installModel) {
        await window.api.ai.installModel(modelId)
      } else {
        // Fallback simulation for now
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      pollModels() // Refresh the list
    } catch (error) {
      console.error('Failed to install model:', error)
    } finally {
      setInstalling(null)
    }
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--m-border-primary)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--m-fg-primary)]">Discover Models</h2>
            <p className="text-xs text-[var(--m-fg-muted)] mt-0.5">Install popular AI models to run locally via Ollama</p>
          </div>
          <button 
            onClick={() => setModelPanelOpen(false)}
            className="p-1.5 rounded-md text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] hover:bg-[var(--m-bg-secondary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          
          {/* Custom Model Input */}
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--m-border-primary)] bg-[var(--m-bg-primary)]">
            <h3 className="text-sm font-medium text-[var(--m-fg-primary)]">Install Custom Model</h3>
            <p className="text-[11px] text-[var(--m-fg-muted)]">Type any valid Ollama model tag (e.g. <code>deepseek-coder:33b</code>)</p>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" 
                value={customModel}
                onChange={e => setCustomModel(e.target.value)}
                placeholder="Model name..."
                className="flex-1 h-[28px] bg-[#00000040] border border-[var(--m-border-primary)] rounded px-2 text-xs text-[var(--m-fg-primary)] focus:outline-none focus:border-[var(--m-accent-blue)]"
              />
              <button
                onClick={() => {
                  if (customModel.trim()) {
                    handleInstall(customModel.trim())
                    setCustomModel('')
                  }
                }}
                disabled={!customModel.trim() || installing !== null}
                className="flex items-center justify-center gap-1.5 h-[28px] px-3 rounded bg-[var(--m-accent-blue)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shrink-0 w-[90px]"
              >
                {installing === customModel.trim() ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Pulling</span>
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    <span>Install</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--m-border-primary)]" />

          {/* Curated Models */}
          <h3 className="text-sm font-medium text-[var(--m-fg-primary)]">Recommended Models</h3>
          {POPULAR_MODELS.map(model => (
            <div key={model.id} className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--m-border-primary)] bg-[var(--m-bg-primary)]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-[var(--m-fg-primary)]">{model.name}</h3>
                  <p className="text-xs text-[var(--m-fg-muted)] mt-0.5">{model.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                {/* Command Bar */}
                <div className="flex-1 flex items-center gap-2 bg-[#00000040] border border-[var(--m-border-primary)] rounded px-2 py-1.5">
                  <Terminal size={12} className="text-[var(--m-fg-subtle)]" />
                  <code className="text-xs font-mono text-[var(--m-accent-green)] flex-1 select-all">
                    {model.command}
                  </code>
                  <button 
                    onClick={() => handleCopy(model.command)}
                    className="text-[10px] px-1.5 py-0.5 rounded text-[var(--m-fg-muted)] hover:text-[var(--m-fg-primary)] hover:bg-[var(--m-bg-secondary)] transition-colors"
                  >
                    {copied === model.command ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Install Button */}
                <button
                  onClick={() => handleInstall(model.id)}
                  disabled={installing !== null}
                  className="flex items-center justify-center gap-1.5 h-[28px] px-3 rounded bg-[var(--m-accent-blue)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shrink-0 w-[90px]"
                >
                  {installing === model.id ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Pulling</span>
                    </>
                  ) : installing ? (
                    <span>Wait</span>
                  ) : (
                    <>
                      <Download size={12} />
                      <span>Install</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--m-border-primary)] bg-[var(--m-bg-secondary)] text-center text-[11px] text-[var(--m-fg-muted)]">
          Requires Ollama to be running on your system.
        </div>

      </div>
    </div>
  )
}
