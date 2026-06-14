import { useState } from "react"
import type { ProviderMode } from "../lib/provider-mode.js"
import { isProviderModeSelectable } from "../lib/provider-mode.js"

/** Props for {@link FirstRunModal}. */
export interface FirstRunModalProps {
  /** Chrome LanguageModel API is present (may still need download). */
  chromeSupported: boolean
  /** Chrome model is already available. */
  chromeReady: boolean
  onExplore: () => void
  onComplete: (mode: ProviderMode) => void
  /** User chose Chrome but model must download first. */
  onChromeInstall: () => void
}

/** First-run provider selection modal. */
export function FirstRunModal({
  chromeSupported,
  chromeReady,
  onExplore,
  onComplete,
  onChromeInstall,
}: FirstRunModalProps) {
  const [mode, setMode] = useState<ProviderMode>(chromeSupported ? "chrome-ai" : "demo")

  const submit = () => {
    if (!isProviderModeSelectable(mode)) return
    if (mode === "chrome-ai" && chromeSupported && !chromeReady) {
      onChromeInstall()
      return
    }
    onComplete(mode)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
    >
      <div className="relative flex w-[min(420px,92vw)] flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container p-6">
        <button
          type="button"
          onClick={onExplore}
          className="absolute right-3 top-3 rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          aria-label="Explore without choosing a provider"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <h2 id="first-run-title" className="pr-8 font-display text-headline text-on-surface">
          Choose a model provider
        </h2>
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
          <label className="flex items-center gap-2 text-body text-on-surface-variant">
            <input type="radio" name="provider" checked={mode === "openai"} disabled />
            OpenAI (coming soon)
          </label>
          <label className="flex items-center gap-2 text-body text-on-surface-variant">
            <input type="radio" name="provider" checked={mode === "claude"} disabled />
            Claude (coming soon)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-body">
            <input type="radio" name="provider" checked={mode === "demo"} onChange={() => setMode("demo")} />
            Demo mode (offline)
          </label>
        </div>
        <button
          type="button"
          onClick={submit}
          className="rounded bg-primary py-2.5 font-mono text-label font-bold text-on-primary hover:brightness-110"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
