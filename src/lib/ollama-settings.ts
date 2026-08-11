/** Ollama connection settings for the browser demo (non-secret). */
export interface OllamaSettings {
  /** Ollama HTTP API base URL. */
  baseURL: string
  /** Default model tag (e.g. qwen2.5-coder:1.5b). */
  model: string
}

/** Defaults match local Ollama + coding eval profile. */
export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  baseURL: "http://localhost:11434",
  model: "qwen2.5-coder:1.5b",
}

/** localStorage key for Ollama settings JSON. */
export const OLLAMA_SETTINGS_STORAGE_KEY = "ecp:browser-demo:ollama-settings"

/** Read Ollama settings from localStorage (falls back to defaults). */
export function readOllamaSettings(): OllamaSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_OLLAMA_SETTINGS }
  const raw = localStorage.getItem(OLLAMA_SETTINGS_STORAGE_KEY)
  if (!raw) return { ...DEFAULT_OLLAMA_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<OllamaSettings>
    return {
      baseURL:
        typeof parsed.baseURL === "string" && parsed.baseURL.trim()
          ? parsed.baseURL.trim()
          : DEFAULT_OLLAMA_SETTINGS.baseURL,
      model:
        typeof parsed.model === "string" && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULT_OLLAMA_SETTINGS.model,
    }
  } catch {
    return { ...DEFAULT_OLLAMA_SETTINGS }
  }
}

/** Persist Ollama settings. */
export function storeOllamaSettings(settings: OllamaSettings): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(
    OLLAMA_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      baseURL: settings.baseURL.trim() || DEFAULT_OLLAMA_SETTINGS.baseURL,
      model: settings.model.trim() || DEFAULT_OLLAMA_SETTINGS.model,
    })
  )
}
