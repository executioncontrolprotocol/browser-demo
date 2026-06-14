/** Provider mode for the browser demo app UI. */
export type ProviderMode = "chrome-ai" | "openai" | "claude" | "demo"

/** Chat assistant behavior. */
export type AssistantMode = "guided" | "authoring"

/** Provider modes selectable in the first-run modal (cloud providers are coming soon). */
export const SELECTABLE_PROVIDER_MODES: readonly ProviderMode[] = ["chrome-ai", "demo"] as const

const PROVIDER_CAPABILITY: Record<ProviderMode, string> = {
  "chrome-ai": "@executioncontextprotocol/chrome-ai.generate",
  openai: "@executioncontextprotocol/openai.generate",
  claude: "@executioncontextprotocol/claude.generate",
  demo: "@executioncontextprotocol/demo.generate",
}

/** Whether the provider can be chosen in the demo UI. */
export function isProviderModeSelectable(mode: ProviderMode): boolean {
  return SELECTABLE_PROVIDER_MODES.includes(mode)
}

/** Map provider mode to a harness-compatible generate capability id. */
export function providerCapabilityId(mode: ProviderMode): string {
  return PROVIDER_CAPABILITY[mode]
}

/** localStorage key for persisted provider mode (API keys live in encrypted vault). */
export const PROVIDER_MODE_STORAGE_KEY = "ecp:browser-demo:provider-mode"

function parseProviderMode(raw: string | null): ProviderMode | null {
  if (raw === "chrome-ai" || raw === "openai" || raw === "claude" || raw === "demo") return raw
  return null
}

/** Read persisted provider mode for this demo app. */
export function readStoredProviderMode(): ProviderMode | null {
  if (typeof localStorage === "undefined") return null
  const mode = parseProviderMode(localStorage.getItem(PROVIDER_MODE_STORAGE_KEY))
  if (mode && !isProviderModeSelectable(mode)) return null
  return mode
}

/** Persist provider mode for this demo app. */
export function storeProviderMode(mode: ProviderMode): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(PROVIDER_MODE_STORAGE_KEY, mode)
}

/** Chrome install UI surface. */
export type ChromeInstallUi = "idle" | "dialog" | "toast" | "done"

/** Install state from @executioncontextprotocol/chrome-ai.getModelInstallState. */
export interface ChromeInstallSnapshot {
  phase: string
  status?: string
  loaded?: number
  total?: number
  error?: string
}
