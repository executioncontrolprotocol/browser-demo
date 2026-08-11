import { useCallback, useEffect, useRef, useState } from "react"
import type { OllamaSettings } from "../lib/ollama-settings.js"
import { DEFAULT_OLLAMA_SETTINGS } from "../lib/ollama-settings.js"
import {
  formatOllamaListError,
  pickOllamaModelFromList,
  type OllamaModelListStatus,
} from "../lib/ollama-models.js"
import {
  DEFAULT_BRIDGE_BASE_URL,
  listModelsViaBridge,
  type BridgeSettings,
} from "../lib/ecp-bridge.js"

const LIST_DEBOUNCE_MS = 400

/** Props for {@link OllamaSettingsFields}. */
export interface OllamaSettingsFieldsProps {
  value: OllamaSettings
  onChange: (next: OllamaSettings) => void
  bridge: BridgeSettings
  onBridgeChange: (next: BridgeSettings) => void
  /** Fires when listing readiness changes (Continue gating). */
  onReadyChange?: (ready: boolean) => void
}

/** Bridge pairing + Ollama model fields (lists models via `ecp up`). */
export function OllamaSettingsFields({
  value,
  onChange,
  bridge,
  onBridgeChange,
  onReadyChange,
}: OllamaSettingsFieldsProps) {
  const [status, setStatus] = useState<OllamaModelListStatus>("idle")
  const [models, setModels] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const onChangeRef = useRef(onChange)
  const onReadyChangeRef = useRef(onReadyChange)
  const valueRef = useRef(value)
  onChangeRef.current = onChange
  onReadyChangeRef.current = onReadyChange
  valueRef.current = value

  const applyModels = useCallback((nextModels: string[]) => {
    setModels(nextModels)
    if (nextModels.length === 0) {
      setStatus("empty")
      setErrorMessage(null)
      onReadyChangeRef.current?.(false)
      return
    }
    setStatus("ready")
    setErrorMessage(null)
    const chosen = pickOllamaModelFromList(nextModels, valueRef.current.model)
    if (chosen && chosen !== valueRef.current.model) {
      onChangeRef.current({ ...valueRef.current, model: chosen })
    }
    const selected = chosen ?? valueRef.current.model
    onReadyChangeRef.current?.(Boolean(selected && nextModels.includes(selected)))
  }, [])

  const refresh = useCallback(
    async (settings: BridgeSettings, signal?: AbortSignal) => {
      if (!settings.token.trim()) {
        setStatus("error")
        setModels([])
        setErrorMessage("Paste the pairing token printed by `ecp up`")
        onReadyChangeRef.current?.(false)
        return
      }
      setStatus("loading")
      setErrorMessage(null)
      onReadyChangeRef.current?.(false)
      try {
        const nextModels = await listModelsViaBridge(settings, signal)
        if (signal?.aborted) return
        applyModels(nextModels)
      } catch (err) {
        if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return
        }
        setStatus("error")
        setModels([])
        setErrorMessage(formatOllamaListError(err))
        onReadyChangeRef.current?.(false)
      }
    },
    [applyModels]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void refresh(bridge, controller.signal)
    }, LIST_DEBOUNCE_MS)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [bridge.baseURL, bridge.token, refresh])

  useEffect(() => {
    if (status !== "ready") {
      onReadyChange?.(false)
      return
    }
    onReadyChange?.(Boolean(value.model && models.includes(value.model)))
  }, [status, value.model, models, onReadyChange])

  const statusLine = (() => {
    switch (status) {
      case "loading":
        return "Loading installed models via ecp up…"
      case "ready":
        return `${models.length} model${models.length === 1 ? "" : "s"} available`
      case "empty":
        return `No models installed. Run ollama pull ${DEFAULT_OLLAMA_SETTINGS.model}`
      case "error":
        return errorMessage ?? "Could not list models"
      default:
        return null
    }
  })()

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant p-3">
      <p className="font-mono text-label font-bold text-on-surface">Ollama via ecp up</p>
      <p className="text-body text-on-surface-variant">
        Run <code className="font-mono text-label">ecp up</code> to open this demo with a pairing
        token, or paste a token below. The daemon talks to Ollama on loopback (Chromium Private
        Network Access on hosted HTTPS).
      </p>
      <label className="flex flex-col gap-1 text-body">
        <span>Bridge URL</span>
        <input
          type="url"
          value={bridge.baseURL}
          onChange={(e) => onBridgeChange({ ...bridge, baseURL: e.target.value })}
          placeholder={DEFAULT_BRIDGE_BASE_URL}
          className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-body">
        <span>Pairing token</span>
        <input
          type="password"
          value={bridge.token}
          onChange={(e) => onBridgeChange({ ...bridge, token: e.target.value })}
          placeholder="from ecp up"
          className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
          autoComplete="off"
        />
      </label>
      <div className="flex flex-col gap-1 text-body">
        <span>Model</span>
        <div className="flex gap-2">
          <select
            value={models.includes(value.model) ? value.model : ""}
            disabled={status !== "ready" || models.length === 0}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            className="min-w-0 flex-1 rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body disabled:opacity-50"
            aria-label="Ollama model"
          >
            {status !== "ready" || models.length === 0 ? (
              <option value="">Select a model</option>
            ) : null}
            {models.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void refresh(bridge)}
            disabled={status === "loading"}
            className="shrink-0 rounded border border-outline-variant px-3 py-2 font-mono text-label font-bold disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>
      {statusLine ? (
        <p
          className={`text-body ${status === "error" || status === "empty" ? "text-error" : "text-on-surface-variant"}`}
          role="status"
        >
          {statusLine}
        </p>
      ) : null}
    </div>
  )
}
