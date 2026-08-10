import { listOllamaModels } from "@executioncontrolprotocol/extension-ollama"
import { DEFAULT_OLLAMA_SETTINGS } from "./ollama-settings.js"

export { listOllamaModels }

/** Listing lifecycle for Ollama settings UI. */
export type OllamaModelListStatus = "idle" | "loading" | "ready" | "error" | "empty"

/**
 * Prefer current model when listed; else coding default when present; else first tag.
 */
export function pickOllamaModelFromList(
  models: readonly string[],
  currentModel: string,
  preferredDefault: string = DEFAULT_OLLAMA_SETTINGS.model
): string | undefined {
  if (models.length === 0) return undefined
  if (currentModel && models.includes(currentModel)) return currentModel
  if (models.includes(preferredDefault)) return preferredDefault
  return models[0]
}

/** Human-readable listing error with CORS / pull hints when useful. */
export function formatOllamaListError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("cors") ||
    lower.includes("load failed")
  ) {
    return `${message}. If the server is running, set OLLAMA_ORIGINS to your Vite origin (e.g. http://localhost:5173).`
  }
  return message
}
