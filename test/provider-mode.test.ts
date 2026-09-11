import { describe, expect, it, beforeEach } from "vitest"
import {
  canContinueFirstRun,
  harnessCapabilityId,
  isProviderModeSelectable,
  preferredModalProviderMode,
  providerCapabilityId,
  readStoredProviderMode,
  resolveDemoSession,
  storeProviderMode,
  PROVIDER_MODE_STORAGE_KEY,
} from "../src/lib/provider-mode.js"

function installMemoryLocalStorage(): void {
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
      clear: () => {
        store.clear()
      },
    },
  })
}

describe("isProviderModeSelectable", () => {
  it("allows chrome-ai, ollama, and anthropic", () => {
    expect(isProviderModeSelectable("chrome-ai")).toBe(true)
    expect(isProviderModeSelectable("ollama")).toBe(true)
    expect(isProviderModeSelectable("anthropic")).toBe(true)
    expect(isProviderModeSelectable("demo" as never)).toBe(false)
  })

  it("keeps openai unavailable in the modal", () => {
    expect(isProviderModeSelectable("openai")).toBe(false)
  })
})

describe("resolveDemoSession", () => {
  it("maps ollama UI value to coding harness + ollama provider", () => {
    expect(resolveDemoSession("ollama")).toEqual({ provider: "ollama", harness: "coding" })
    expect(providerCapabilityId("ollama")).toBe("@executioncontrolprotocol/ollama.generate")
    expect(harnessCapabilityId("coding")).toBe(
      "@executioncontrolprotocol/harness-browser-coding.evaluate"
    )
  })

  it("maps anthropic to coding harness", () => {
    expect(resolveDemoSession("anthropic")).toEqual({ provider: "anthropic", harness: "coding" })
    expect(providerCapabilityId("anthropic")).toBe(
      "@executioncontrolprotocol/anthropic.generate"
    )
  })

  it("maps chrome-ai to nano harness", () => {
    expect(resolveDemoSession("chrome-ai")).toEqual({ provider: "chrome-ai", harness: "nano" })
    expect(harnessCapabilityId("nano")).toBe(
      "@executioncontrolprotocol/harness-browser-nano.evaluate"
    )
  })
})

describe("canContinueFirstRun", () => {
  it("requires vault key and model for anthropic", () => {
    expect(
      canContinueFirstRun("anthropic", {
        chromeSupported: true,
        ollamaBridgeAvailable: false,
        ollamaReady: false,
        ollamaModel: "",
        anthropicVaultReady: true,
        anthropicKeyPresent: true,
        anthropicModel: "claude-sonnet-4-5",
      })
    ).toBe(true)
    expect(
      canContinueFirstRun("anthropic", {
        chromeSupported: true,
        ollamaBridgeAvailable: false,
        ollamaReady: false,
        ollamaModel: "",
        anthropicVaultReady: true,
        anthropicKeyPresent: false,
        anthropicModel: "claude-sonnet-4-5",
      })
    ).toBe(false)
  })
})

describe("preferredModalProviderMode", () => {
  it("falls back to chrome-ai when ollama is stored but bridge is down", () => {
    expect(
      preferredModalProviderMode("ollama", {
        chromeSupported: true,
        ollamaBridgeAvailable: false,
      })
    ).toBe("chrome-ai")
  })

  it("keeps ollama when the bridge is usable", () => {
    expect(
      preferredModalProviderMode("ollama", {
        chromeSupported: true,
        ollamaBridgeAvailable: true,
      })
    ).toBe("ollama")
  })

  it("keeps chrome-ai when stored", () => {
    expect(
      preferredModalProviderMode("chrome-ai", {
        chromeSupported: true,
        ollamaBridgeAvailable: false,
      })
    ).toBe("chrome-ai")
  })
})

describe("readStoredProviderMode", () => {
  beforeEach(() => {
    installMemoryLocalStorage()
    localStorage.clear()
  })

  it("round-trips selectable modes", () => {
    storeProviderMode("chrome-ai")
    expect(readStoredProviderMode()).toBe("chrome-ai")
    storeProviderMode("ollama")
    expect(readStoredProviderMode()).toBe("ollama")
    storeProviderMode("anthropic")
    expect(readStoredProviderMode()).toBe("anthropic")
  })

  it("ignores non-selectable stored cloud modes", () => {
    expect(readStoredProviderMode()).toBe(null)
    localStorage.setItem(PROVIDER_MODE_STORAGE_KEY, "openai")
    expect(readStoredProviderMode()).toBe(null)
    localStorage.setItem(PROVIDER_MODE_STORAGE_KEY, "claude")
    expect(readStoredProviderMode()).toBe(null)
  })
})
