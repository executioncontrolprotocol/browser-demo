import { describe, expect, it, afterEach, vi } from "vitest"
import {
  DEFAULT_BRIDGE_BASE_URL,
  detectEcpBridge,
  isOllamaBridgeUsable,
  listModelsViaBridge,
  parseBridgeQueryParams,
  consumeBridgeQueryParams,
  BRIDGE_SETTINGS_STORAGE_KEY,
} from "../src/lib/ecp-bridge.js"
import { canContinueFirstRun } from "../src/lib/provider-mode.js"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(BRIDGE_SETTINGS_STORAGE_KEY)
  }
})

describe("isOllamaBridgeUsable", () => {
  it("requires available and ollamaReachable", () => {
    expect(isOllamaBridgeUsable({ available: false })).toBe(false)
    expect(isOllamaBridgeUsable({ available: true, ollamaReachable: false })).toBe(false)
    expect(isOllamaBridgeUsable({ available: true, ollamaReachable: true })).toBe(true)
  })
})

describe("detectEcpBridge", () => {
  it("returns available when /health succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, ollamaReachable: true, version: "0.10.0" }),
      }))
    )
    await expect(detectEcpBridge()).resolves.toEqual({
      available: true,
      ollamaReachable: true,
      version: "0.10.0",
    })
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toBe(`${DEFAULT_BRIDGE_BASE_URL}/health`)
  })

  it("returns unavailable on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      })
    )
    await expect(detectEcpBridge()).resolves.toEqual({ available: false })
  })
})

describe("listModelsViaBridge", () => {
  it("posts invoke with bearer token", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, result: { models: ["a:latest"] } }),
    }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(
      listModelsViaBridge({ baseURL: DEFAULT_BRIDGE_BASE_URL, token: "tok" })
    ).resolves.toEqual(["a:latest"])
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${DEFAULT_BRIDGE_BASE_URL}/v1/invoke`)
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok" })
  })
})

describe("parseBridgeQueryParams", () => {
  it("reads token and bridge from the query string", () => {
    expect(parseBridgeQueryParams("?token=abc&bridge=http://127.0.0.1:3090")).toEqual({
      token: "abc",
      baseURL: "http://127.0.0.1:3090",
    })
  })

  it("returns undefined when pairing params are absent", () => {
    expect(parseBridgeQueryParams("?foo=1")).toBeUndefined()
  })
})

describe("consumeBridgeQueryParams", () => {
  it("merges query token into settings and strips the URL", () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, String(value))
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
      },
    })

    let replaced = ""
    const locationLike = {
      search: "?token=from-up&bridge=http://127.0.0.1:3090&x=1",
      pathname: "/browser-demo/",
      hash: "",
    }
    const historyLike = {
      replaceState: (_state: unknown, _title: string, url: string) => {
        replaced = url
      },
    }

    const settings = consumeBridgeQueryParams(locationLike, historyLike)
    expect(settings).toEqual({
      token: "from-up",
      baseURL: "http://127.0.0.1:3090",
    })
    expect(replaced).toBe("/browser-demo/?x=1")
    expect(store.get(BRIDGE_SETTINGS_STORAGE_KEY)).toContain("from-up")
  })
})

describe("canContinueFirstRun with bridge gate", () => {
  it("blocks Ollama when the bridge is unavailable", () => {
    expect(
      canContinueFirstRun("ollama", {
        chromeSupported: true,
        ollamaBridgeAvailable: false,
        ollamaReady: true,
        ollamaModel: "qwen2.5-coder:1.5b",
      })
    ).toBe(false)
  })

  it("allows Ollama when bridge and model listing are ready", () => {
    expect(
      canContinueFirstRun("ollama", {
        chromeSupported: false,
        ollamaBridgeAvailable: true,
        ollamaReady: true,
        ollamaModel: "qwen2.5-coder:1.5b",
      })
    ).toBe(true)
  })

  it("still requires Chrome support for chrome-ai", () => {
    expect(
      canContinueFirstRun("chrome-ai", {
        chromeSupported: false,
        ollamaBridgeAvailable: true,
        ollamaReady: true,
        ollamaModel: "x",
      })
    ).toBe(false)
    expect(
      canContinueFirstRun("chrome-ai", {
        chromeSupported: true,
        ollamaBridgeAvailable: false,
        ollamaReady: false,
        ollamaModel: "",
      })
    ).toBe(true)
  })
})
