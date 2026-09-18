import { useEffect, useState } from "react"
import {
  getBrowserSecret,
  hasBrowserVault,
  isBrowserVaultUnlocked,
} from "@executioncontrolprotocol/browser"
import type { ProviderMode } from "../lib/provider-mode.js"
import { canContinueFirstRun, preferredModalProviderMode } from "../lib/provider-mode.js"
import type { OllamaSettings } from "../lib/ollama-settings.js"
import type { AnthropicSettings } from "../lib/anthropic-settings.js"
import type { BridgeSettings } from "../lib/ecp-bridge.js"
import { ProviderApiKeyFields } from "./ProviderApiKeyFields.js"
import { OllamaSettingsFields } from "./OllamaSettingsFields.js"
import { AnthropicSettingsFields } from "./AnthropicSettingsFields.js"
import { DemoEnvPresetFields } from "./DemoEnvPresetFields.js"
import type { DemoEnvPreset } from "../lib/demo-env-preset.js"

/** Props for {@link FirstRunModal}. */
export interface FirstRunModalProps {
  /** Chrome LanguageModel API is present (may still need download). */
  chromeSupported: boolean
  /** Chrome model is already available. */
  chromeReady: boolean
  /** Local `ecp up` is reachable and Ollama is up. */
  ollamaBridgeAvailable: boolean
  /** Optional status hint when Ollama is disabled. */
  ollamaBridgeHint?: string
  /** Last selected provider (from app state / localStorage). */
  initialMode?: ProviderMode
  onExplore: () => void
  onComplete: (mode: ProviderMode, ollama?: OllamaSettings) => void
  /** User chose Chrome but model must download first. */
  onChromeInstall: () => void
  /** Open vault setup when user wants encrypted API key storage. */
  onRequestVaultSetup: () => void
  /** Current Ollama settings (editable when Ollama selected). */
  ollamaSettings: OllamaSettings
  onOllamaSettingsChange: (settings: OllamaSettings) => void
  /** Current Anthropic settings (editable when Anthropic selected). */
  anthropicSettings: AnthropicSettings
  onAnthropicSettingsChange: (settings: AnthropicSettings) => void
  bridgeSettings: BridgeSettings
  onBridgeSettingsChange: (settings: BridgeSettings) => void
  demoEnvPreset: DemoEnvPreset
  onDemoEnvPresetChange: (preset: DemoEnvPreset) => void
}

/** First-run provider selection modal. */
export function FirstRunModal({
  chromeSupported,
  chromeReady,
  ollamaBridgeAvailable,
  ollamaBridgeHint,
  initialMode = "chrome-ai",
  onExplore,
  onComplete,
  onChromeInstall,
  onRequestVaultSetup,
  ollamaSettings,
  onOllamaSettingsChange,
  anthropicSettings,
  onAnthropicSettingsChange,
  bridgeSettings,
  onBridgeSettingsChange,
  demoEnvPreset,
  onDemoEnvPresetChange,
}: FirstRunModalProps) {
  const [mode, setMode] = useState<ProviderMode>(() =>
    preferredModalProviderMode(initialMode, { chromeSupported, ollamaBridgeAvailable })
  )
  const [ollamaReady, setOllamaReady] = useState(false)
  const [anthropicVaultReady, setAnthropicVaultReady] = useState(false)
  const [anthropicKeyPresent, setAnthropicKeyPresent] = useState(false)

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const vaultReady = hasBrowserVault() && isBrowserVaultUnlocked()
      if (!vaultReady) {
        if (!cancelled) {
          setAnthropicVaultReady(false)
          setAnthropicKeyPresent(false)
        }
        return
      }
      const key = await getBrowserSecret("ANTHROPIC_API_KEY")
      if (!cancelled) {
        setAnthropicVaultReady(true)
        setAnthropicKeyPresent(Boolean(key?.trim()))
      }
    }
    void refresh()
    const id = window.setInterval(() => {
      void refresh()
    }, 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [mode])

  const canContinue = canContinueFirstRun(mode, {
    chromeSupported,
    ollamaBridgeAvailable,
    ollamaReady,
    ollamaModel: ollamaSettings.model,
    anthropicVaultReady,
    anthropicKeyPresent,
    anthropicModel: anthropicSettings.model,
  })

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
            {ollamaBridgeAvailable
              ? "Chrome requires a click to start the Gemini Nano download. Choose a provider and click Continue, or close this dialog to explore without a provider."
              : "Local Ollama (`ecp up`) is not reachable. Chrome AI or Claude (Anthropic) can still be used."}
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
            <label
              className={`flex items-center gap-2 text-body ${ollamaBridgeAvailable ? "cursor-pointer" : "text-on-surface-variant"}`}
            >
              <input
                type="radio"
                name="provider"
                checked={mode === "ollama"}
                disabled={!ollamaBridgeAvailable}
                onChange={() => setMode("ollama")}
              />
              Ollama (Fluent / TypeScript harness)
              {!ollamaBridgeAvailable ? " (unavailable)" : ""}
            </label>
            {!ollamaBridgeAvailable && ollamaBridgeHint ? (
              <p className="pl-6 text-body text-on-surface-variant">{ollamaBridgeHint}</p>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 text-body">
              <input
                type="radio"
                name="provider"
                checked={mode === "anthropic"}
                onChange={() => setMode("anthropic")}
              />
              Claude (Anthropic / coding harness)
            </label>
            <label className="flex items-center gap-2 text-body text-on-surface-variant">
              <input type="radio" name="provider" checked={mode === "openai"} disabled />
              OpenAI (coming soon)
            </label>
          </div>
          <DemoEnvPresetFields value={demoEnvPreset} onChange={onDemoEnvPresetChange} />
          {mode === "ollama" && ollamaBridgeAvailable ? (
            <OllamaSettingsFields
              value={ollamaSettings}
              onChange={onOllamaSettingsChange}
              bridge={bridgeSettings}
              onBridgeChange={onBridgeSettingsChange}
              onReadyChange={setOllamaReady}
            />
          ) : null}
          {mode === "anthropic" ? (
            <AnthropicSettingsFields
              value={anthropicSettings}
              onChange={onAnthropicSettingsChange}
            />
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
