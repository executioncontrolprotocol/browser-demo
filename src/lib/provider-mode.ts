/** Provider mode for the browser demo app UI. */
export type ProviderMode = "chrome-ai" | "openai" | "claude" | "ollama"

/** Harness mode — independent of provider; resolved from UI profile for now. */
export type HarnessMode = "nano" | "coding"

/** Chat assistant behavior. */
export type AssistantMode = "guided" | "authoring"

/** Provider modes selectable in the first-run modal. */
export const SELECTABLE_PROVIDER_MODES: readonly ProviderMode[] = ["chrome-ai", "ollama"] as const

const PROVIDER_CAPABILITY: Record<ProviderMode, string> = {
  "chrome-ai": "@executioncontrolprotocol/chrome-ai.generate",
  openai: "@executioncontrolprotocol/openai.generate",
  claude: "@executioncontrolprotocol/claude.generate",
  ollama: "@executioncontrolprotocol/ollama.generate",
}

const HARNESS_CAPABILITY: Record<HarnessMode, string> = {
  nano: "@executioncontrolprotocol/harness-browser-nano.evaluate",
  coding: "@executioncontrolprotocol/harness-browser-coding.evaluate",
}

/** Resolved provider + harness for a demo UI selection. */
export interface DemoSession {
  /** Model provider mode. */
  provider: ProviderMode
  /** Harness mode. */
  harness: HarnessMode
}

/**
 * Map a single UI provider value to independent provider + harness switches.
 * Today: ollama → coding harness; everything else → nano.
 */
export function resolveDemoSession(uiMode: ProviderMode): DemoSession {
  if (uiMode === "ollama") {
    return { provider: "ollama", harness: "coding" }
  }
  return { provider: uiMode, harness: "nano" }
}

/** Whether the provider can be chosen in the demo UI. */
export function isProviderModeSelectable(mode: ProviderMode): boolean {
  return SELECTABLE_PROVIDER_MODES.includes(mode)
}

/** Map provider mode to a harness-compatible generate capability id. */
export function providerCapabilityId(mode: ProviderMode): string {
  return PROVIDER_CAPABILITY[mode]
}

/** Map harness mode to evaluate capability id. */
export function harnessCapabilityId(mode: HarnessMode): string {
  return HARNESS_CAPABILITY[mode]
}

/** localStorage key for persisted provider mode (API keys live in encrypted vault). */
export const PROVIDER_MODE_STORAGE_KEY = "ecp:browser-demo:provider-mode"

function parseProviderMode(raw: string | null): ProviderMode | null {
  if (raw === "chrome-ai" || raw === "openai" || raw === "claude" || raw === "ollama") return raw
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

/** Install state from @executioncontrolprotocol/chrome-ai.getModelInstallState. */
export interface ChromeInstallSnapshot {
  phase: string
  status?: string
  loaded?: number
  total?: number
  error?: string
}
