import type { OllamaSettings } from "../lib/ollama-settings.js"
import { DEFAULT_OLLAMA_SETTINGS } from "../lib/ollama-settings.js"

/** Props for {@link OllamaSettingsFields}. */
export interface OllamaSettingsFieldsProps {
  value: OllamaSettings
  onChange: (next: OllamaSettings) => void
}

/** Non-secret Ollama endpoint and model fields. */
export function OllamaSettingsFields({ value, onChange }: OllamaSettingsFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-outline-variant p-3">
      <p className="font-mono text-label font-bold text-on-surface">Ollama settings</p>
      <p className="text-body text-on-surface-variant">
        Browser calls need CORS. Set{" "}
        <code className="font-mono text-label">OLLAMA_ORIGINS</code> to your Vite origin (e.g.{" "}
        <code className="font-mono text-label">http://localhost:5173</code>).
      </p>
      <label className="flex flex-col gap-1 text-body">
        <span>Base URL</span>
        <input
          type="url"
          value={value.baseURL}
          onChange={(e) => onChange({ ...value, baseURL: e.target.value })}
          placeholder={DEFAULT_OLLAMA_SETTINGS.baseURL}
          className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-body">
        <span>Model</span>
        <input
          type="text"
          value={value.model}
          onChange={(e) => onChange({ ...value, model: e.target.value })}
          placeholder={DEFAULT_OLLAMA_SETTINGS.model}
          className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
          autoComplete="off"
        />
      </label>
    </div>
  )
}
