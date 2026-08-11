/** Default `ecp up` loopback base URL (port 3090). */
export const DEFAULT_BRIDGE_BASE_URL = "http://127.0.0.1:3090"

/** localStorage key for bridge pairing settings. */
export const BRIDGE_SETTINGS_STORAGE_KEY = "ecp:browser-demo:bridge-settings"

/** Pairing settings for the local ECP daemon. */
export interface BridgeSettings {
  /** Daemon base URL (default http://127.0.0.1:3090). */
  baseURL: string
  /** Bearer token printed by `ecp up`. */
  token: string
}

/** Result of probing `GET /health`. */
export interface BridgeDetectResult {
  /** Daemon responded successfully. */
  available: boolean
  /** Ollama reachable from the daemon. */
  ollamaReachable?: boolean
  /** Daemon version string. */
  version?: string
}

/** Defaults for bridge settings. */
export const DEFAULT_BRIDGE_SETTINGS: BridgeSettings = {
  baseURL: DEFAULT_BRIDGE_BASE_URL,
  token: "",
}

/** Whether the Ollama UI option should be enabled. */
export function isOllamaBridgeUsable(result: BridgeDetectResult): boolean {
  return result.available && result.ollamaReachable === true
}

/** Read bridge settings from localStorage. */
export function readBridgeSettings(): BridgeSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_BRIDGE_SETTINGS }
  const raw = localStorage.getItem(BRIDGE_SETTINGS_STORAGE_KEY)
  if (!raw) return { ...DEFAULT_BRIDGE_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<BridgeSettings>
    return {
      baseURL:
        typeof parsed.baseURL === "string" && parsed.baseURL.trim()
          ? parsed.baseURL.trim()
          : DEFAULT_BRIDGE_SETTINGS.baseURL,
      token: typeof parsed.token === "string" ? parsed.token : "",
    }
  } catch {
    return { ...DEFAULT_BRIDGE_SETTINGS }
  }
}

/** Persist bridge settings. */
export function storeBridgeSettings(settings: BridgeSettings): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(
    BRIDGE_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      baseURL: settings.baseURL.trim() || DEFAULT_BRIDGE_BASE_URL,
      token: settings.token.trim(),
    })
  )
}

/**
 * Parse `?token=` / `?bridge=` from a query string (as sent by `ecp up`).
 * Returns undefined when neither param is present.
 */
export function parseBridgeQueryParams(
  search: string
): Partial<BridgeSettings> | undefined {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  const token = params.get("token")?.trim() ?? ""
  const bridge = params.get("bridge")?.trim() ?? ""
  if (!token && !bridge) return undefined
  const next: Partial<BridgeSettings> = {}
  if (token) next.token = token
  if (bridge) next.baseURL = bridge
  return next
}

/**
 * Apply `ecp up` query params into stored bridge settings and strip them from the URL.
 * Safe to call once at app boot.
 */
export function consumeBridgeQueryParams(
  locationLike: Pick<Location, "search" | "pathname" | "hash"> = window.location,
  historyLike: Pick<History, "replaceState"> = window.history
): BridgeSettings {
  const stored = readBridgeSettings()
  const fromQuery = parseBridgeQueryParams(locationLike.search)
  if (!fromQuery) return stored

  const merged: BridgeSettings = {
    baseURL: fromQuery.baseURL?.trim() || stored.baseURL,
    token: fromQuery.token?.trim() || stored.token,
  }
  storeBridgeSettings(merged)

  if (typeof historyLike.replaceState === "function") {
    const params = new URLSearchParams(
      locationLike.search.startsWith("?")
        ? locationLike.search.slice(1)
        : locationLike.search
    )
    params.delete("token")
    params.delete("bridge")
    const qs = params.toString()
    const next = `${locationLike.pathname}${qs ? `?${qs}` : ""}${locationLike.hash}`
    historyLike.replaceState(null, "", next)
  }

  return merged
}

/**
 * Probe the local ECP daemon health endpoint.
 * On Chromium + hosted HTTPS this exercises Private Network Access.
 */
export async function detectEcpBridge(
  baseURL: string = DEFAULT_BRIDGE_BASE_URL,
  signal?: AbortSignal
): Promise<BridgeDetectResult> {
  const root = baseURL.replace(/\/$/, "").trim() || DEFAULT_BRIDGE_BASE_URL
  try {
    const res = await fetch(`${root}/health`, { method: "GET", signal })
    if (!res.ok) return { available: false }
    const body = (await res.json()) as {
      ok?: boolean
      ollamaReachable?: boolean
      version?: string
    }
    if (body.ok !== true) return { available: false }
    return {
      available: true,
      ollamaReachable: Boolean(body.ollamaReachable),
      version: typeof body.version === "string" ? body.version : undefined,
    }
  } catch {
    return { available: false }
  }
}

/** Options for {@link invokeViaBridge}. */
export interface BridgeInvokeOptions {
  /** Daemon base URL. */
  baseURL: string
  /** Pairing token. */
  token: string
  /** Capability id to invoke. */
  capability: string
  /** Capability input. */
  input?: unknown
  /** Optional provider override. */
  provider?: string
  /** Optional abort signal. */
  signal?: AbortSignal
}

/** Minimal invoke result shape returned by the daemon. */
export interface BridgeInvokeResult<T = unknown> {
  success: boolean
  result?: T
  diagnostics?: Array<{ message?: string }>
}

/**
 * Invoke a capability through `ecp up` (`POST /v1/invoke`).
 */
export async function invokeViaBridge<T = unknown>(
  options: BridgeInvokeOptions
): Promise<BridgeInvokeResult<T>> {
  const root = options.baseURL.replace(/\/$/, "").trim()
  if (!root) throw new Error("Bridge base URL is required")
  if (!options.token.trim()) throw new Error("Bridge pairing token is required")

  const res = await fetch(`${root}/v1/invoke`, {
    method: "POST",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token.trim()}`,
    },
    body: JSON.stringify({
      capability: options.capability,
      input: options.input ?? {},
      ...(options.provider ? { provider: options.provider } : {}),
    }),
  })

  if (res.status === 401) {
    throw new Error("Bridge unauthorized — check the pairing token from `ecp up`")
  }
  if (!res.ok) {
    let detail = ""
    try {
      detail = (await res.text()).slice(0, 200)
    } catch {
      detail = ""
    }
    throw new Error(detail || `Bridge invoke failed: ${res.status}`)
  }

  return (await res.json()) as BridgeInvokeResult<T>
}

/** List Ollama models via the local daemon. */
export async function listModelsViaBridge(
  settings: BridgeSettings,
  signal?: AbortSignal
): Promise<string[]> {
  const out = await invokeViaBridge<{ models?: string[] }>({
    baseURL: settings.baseURL,
    token: settings.token,
    capability: "@executioncontrolprotocol/ollama.listModels",
    input: {},
    signal,
  })
  if (!out.success) {
    const msg = out.diagnostics?.[0]?.message ?? "listModels failed"
    throw new Error(msg)
  }
  const models = out.result?.models
  return Array.isArray(models) ? models : []
}
