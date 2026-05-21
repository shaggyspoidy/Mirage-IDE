import { useState } from 'react'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { useSettingsStore, ModelProvider } from '../../stores/settingsStore'

interface ApiKeyFormProps {
  provider: ModelProvider
  displayName: string
  isConfigured: boolean
}

export function ApiKeyForm({ provider, displayName, isConfigured }: ApiKeyFormProps): React.JSX.Element {
  const [key, setKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { saveKey, deleteKey } = useSettingsStore()

  const handleSave = async (): Promise<void> => {
    if (!key.trim()) return
    setIsSaving(true)
    await saveKey(provider, key)
    setIsSaving(false)
    setKey('')
  }

  const handleDelete = async (): Promise<void> => {
    await deleteKey(provider)
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-[var(--m-bg-primary)] rounded border border-[var(--m-border-primary)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{displayName}</span>
        {isConfigured && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle2 size={14} /> Configured
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-1">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={isConfigured ? '••••••••••••••••••••' : 'Enter API Key...'}
          className="flex-1 bg-[var(--m-bg-surface)] border border-[var(--m-border-primary)] rounded px-2 py-1.5 text-sm text-[var(--m-fg-primary)] focus:outline-none focus:border-[var(--m-accent-blue)]"
        />
        {isConfigured ? (
          <button
            onClick={handleDelete}
            className="flex items-center justify-center p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-colors"
            title="Delete Key"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={!key.trim() || isSaving}
            className="px-3 py-1.5 bg-[var(--m-accent-blue)] text-white text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
      <p className="text-[10px] text-[var(--m-fg-muted)]">
        Keys are securely encrypted using Windows DPAPI / OS-level encryption. They are never sent anywhere except directly to the AI provider.
      </p>
    </div>
  )
}
