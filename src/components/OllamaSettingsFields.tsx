import { useCallback, useEffect, useRef, useState } from "react"
import type { OllamaSettings } from "../lib/ollama-settings.js"
import { DEFAULT_OLLAMA_SETTINGS } from "../lib/ollama-settings.js"
import {
  formatOllamaListError,
  listOllamaModels,
  pickOllamaModelFromList,
  type OllamaModelListStatus,
} from "../lib/ollama-models.js"

const LIST_DEBOUNCE_MS = 400

/** Props for {@link OllamaSettingsFields}. */
export interface OllamaSettingsFieldsProps {
  value: OllamaSettings
  onChange: (next: OllamaSettings) => void
  /** Fires when listing readiness changes (Continue gating). */
  onReadyChange?: (ready: boolean) => void
}

/** Non-secret Ollama endpoint and model fields with live `/api/tags` listing. */
export function OllamaSettingsFields({
  value,
  onChange,
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
    async (baseURL: string, signal?: AbortSignal) => {
      const trimmed = baseURL.trim()
      if (!trimmed) {
        setStatus("error")
        setModels([])
        setErrorMessage("Base URL is required")
        onReadyChangeRef.current?.(false)
        return
      }
      setStatus("loading")
      setErrorMessage(null)
      onReadyChangeRef.current?.(false)
      try {
        const nextModels = await listOllamaModels(trimmed, { signal })
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
      void refresh(value.baseURL, controller.signal)
    }, LIST_DEBOUNCE_MS)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [value.baseURL, refresh])

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
        return "Loading installed models…"
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
            onClick={() => void refresh(value.baseURL)}
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
