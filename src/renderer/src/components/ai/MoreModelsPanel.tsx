import { useState, useEffect } from 'react'
import { X, Download, Terminal, Loader2, ExternalLink } from 'lucide-react'
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
  const [progress, setProgress] = useState<{ [modelId: string]: number }>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [customModel, setCustomModel] = useState('')

  useEffect(() => {
    if (!window.api || !window.api.ai || !window.api.ai.onInstallProgress) return
    const removeListener = window.api.ai.onInstallProgress((data) => {
      setProgress(prev => ({
        ...prev,
        [data.modelId]: data.progress
      }))
    })
    return () => removeListener()
  }, [])

  if (!isModelPanelOpen) return null

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command)
    setCopied(command)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleInstall = async (modelId: string) => {
    setInstalling(modelId)
    setProgress(prev => ({ ...prev, [modelId]: 0 }))
    try {
      if (window.api && window.api.ai && window.api.ai.installModel) {
        await window.api.ai.installModel(modelId)
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      pollModels() // Refresh the list
    } catch (error) {
      console.error('Failed to install model:', error)
    } finally {
      setInstalling(null)
      setProgress(prev => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
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
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--m-border-primary)] bg-[var(--m-bg-primary)] relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-[var(--m-fg-primary)]">Install Custom Model</h3>
                <p className="text-[11px] text-[var(--m-fg-muted)]">Type any valid Ollama model tag (e.g. <code>deepseek-coder:33b</code>)</p>
              </div>
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (window.api && window.api.window) {
                    window.api.terminal.write('start https://ollama.com/library\r') // Hacky way to open if no openExternal
                  }
                }}
                className="text-[10px] flex items-center gap-1 text-[var(--m-accent-blue)] hover:underline"
              >
                Browse Library <ExternalLink size={10} />
              </a>
            </div>
            
            <div className="flex items-center gap-2 mt-1 z-10 relative">
              <input 
                type="text" 
                value={customModel}
                onChange={e => setCustomModel(e.target.value)}
                placeholder="Model name..."
                className="flex-1 h-[28px] bg-[#00000040] border border-[var(--m-border-primary)] rounded px-2 text-xs text-[var(--m-fg-primary)] focus:outline-none focus:border-[var(--m-accent-blue)]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && customModel.trim() && installing === null) {
                    handleInstall(customModel.trim())
                  }
                }}
              />
              <button
                onClick={() => {
                  if (customModel.trim()) {
                    handleInstall(customModel.trim())
                  }
                }}
                disabled={!customModel.trim() || installing !== null}
                className="flex items-center justify-center gap-1.5 h-[28px] px-3 rounded bg-[var(--m-accent-blue)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shrink-0 min-w-[90px]"
              >
                {installing === customModel.trim() ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>{progress[customModel.trim()] !== undefined ? `${progress[customModel.trim()]}%` : 'Pulling'}</span>
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    <span>Install</span>
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar Background */}
            {installing === customModel.trim() && progress[customModel.trim()] !== undefined && (
              <div 
                className="absolute top-0 left-0 h-full bg-[color-mix(in_srgb,var(--m-accent-blue)_10%,transparent)] transition-all duration-300 pointer-events-none" 
                style={{ width: `${progress[customModel.trim()]}%` }}
              />
            )}
          </div>

          <div className="w-full h-px bg-[var(--m-border-primary)]" />

          {/* Curated Models */}
          <h3 className="text-sm font-medium text-[var(--m-fg-primary)]">Recommended Models</h3>
          {POPULAR_MODELS.map(model => (
            <div key={model.id} className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--m-border-primary)] bg-[var(--m-bg-primary)] relative overflow-hidden">
              
              {/* Progress Bar Background */}
              {installing === model.id && progress[model.id] !== undefined && (
                <div 
                  className="absolute top-0 left-0 h-full bg-[color-mix(in_srgb,var(--m-accent-blue)_10%,transparent)] transition-all duration-300 pointer-events-none" 
                  style={{ width: `${progress[model.id]}%` }}
                />
              )}

              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <h3 className="text-sm font-medium text-[var(--m-fg-primary)]">{model.name}</h3>
                  <p className="text-xs text-[var(--m-fg-muted)] mt-0.5">{model.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1 z-10 relative">
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
                  className="flex items-center justify-center gap-1.5 h-[28px] px-3 rounded bg-[var(--m-accent-blue)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shrink-0 min-w-[90px]"
                >
                  {installing === model.id ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>{progress[model.id] !== undefined ? `${progress[model.id]}%` : 'Pulling'}</span>
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
        <div className="p-3 border-t border-[var(--m-border-primary)] bg-[var(--m-bg-secondary)] text-center text-[11px] text-[var(--m-fg-muted)] flex justify-between px-6">
          <span>Requires Ollama to be running on your system.</span>
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault()
              window.api?.terminal?.write('start https://ollama.com\r')
            }}
            className="text-[var(--m-accent-blue)] hover:underline"
          >
            ollama.com
          </a>
        </div>

      </div>
    </div>
  )
}
