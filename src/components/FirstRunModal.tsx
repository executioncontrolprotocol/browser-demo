import { useState } from "react"
import type { ProviderMode } from "../lib/provider-mode.js"
import { isProviderModeSelectable } from "../lib/provider-mode.js"
import type { OllamaSettings } from "../lib/ollama-settings.js"
import { ProviderApiKeyFields } from "./ProviderApiKeyFields.js"
import { OllamaSettingsFields } from "./OllamaSettingsFields.js"

/** Props for {@link FirstRunModal}. */
export interface FirstRunModalProps {
  /** Chrome LanguageModel API is present (may still need download). */
  chromeSupported: boolean
  /** Chrome model is already available. */
  chromeReady: boolean
  onExplore: () => void
  onComplete: (mode: ProviderMode, ollama?: OllamaSettings) => void
  /** User chose Chrome but model must download first. */
  onChromeInstall: () => void
  /** Open vault setup when user wants encrypted API key storage. */
  onRequestVaultSetup: () => void
  /** Current Ollama settings (editable when Ollama selected). */
  ollamaSettings: OllamaSettings
  onOllamaSettingsChange: (settings: OllamaSettings) => void
}

/** First-run provider selection modal. */
export function FirstRunModal({
  chromeSupported,
  chromeReady,
  onExplore,
  onComplete,
  onChromeInstall,
  onRequestVaultSetup,
  ollamaSettings,
  onOllamaSettingsChange,
}: FirstRunModalProps) {
  const [mode, setMode] = useState<ProviderMode>("chrome-ai")

  const canContinue =
    isProviderModeSelectable(mode) &&
    (mode === "ollama" || (mode === "chrome-ai" && chromeSupported))

  const submit = () => {
    if (!canContinue) return
    if (mode === "chrome-ai" && chromeSupported && !chromeReady) {
      onChromeInstall()
      return
    }
    onComplete(mode, mode === "ollama" ? ollamaSettings : undefined)
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
    >
      <div className="modal-panel">
        <header className="modal-panel-header">
          <button
            type="button"
            onClick={onExplore}
            className="modal-close-btn"
            aria-label="Explore without choosing a provider"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <h2 id="first-run-title" className="pr-8 font-display text-headline text-on-surface">
            Choose a model provider
          </h2>
        </header>

        <div className="modal-panel-scroll flex flex-col gap-4">
          <p className="text-body text-on-surface-variant">
            You can close this dialog and explore with the guided assistant while Chrome AI downloads.
          </p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-body">
              <input
                type="radio"
                name="provider"
                checked={mode === "chrome-ai"}
                disabled={!chromeSupported}
                onChange={() => setMode("chrome-ai")}
              />
              Chrome built-in AI
              {!chromeSupported
                ? " (unavailable)"
                : !chromeReady
                  ? " (download required)"
                  : ""}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-body">
              <input
                type="radio"
                name="provider"
                checked={mode === "ollama"}
                onChange={() => setMode("ollama")}
              />
              Ollama (Fluent / TypeScript harness)
            </label>
            <label className="flex items-center gap-2 text-body text-on-surface-variant">
              <input type="radio" name="provider" checked={mode === "openai"} disabled />
              OpenAI (coming soon)
            </label>
            <label className="flex items-center gap-2 text-body text-on-surface-variant">
              <input type="radio" name="provider" checked={mode === "claude"} disabled />
              Claude (coming soon)
            </label>
          </div>
          {mode === "ollama" ? (
            <OllamaSettingsFields value={ollamaSettings} onChange={onOllamaSettingsChange} />
          ) : null}
          <ProviderApiKeyFields onRequestVaultSetup={onRequestVaultSetup} />
        </div>

        <footer className="modal-panel-footer">
          <button
            type="button"
            onClick={submit}
            disabled={!canContinue}
            className="w-full rounded bg-primary py-2.5 font-mono text-label font-bold text-on-primary transition-[filter] hover:brightness-110 disabled:opacity-50"
          >
            Continue
          </button>
        </footer>
      </div>
    </div>
  )
}
