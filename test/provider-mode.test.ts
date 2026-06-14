import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  PROVIDER_MODE_STORAGE_KEY,
  isProviderModeSelectable,
  readStoredProviderMode,
  storeProviderMode,
} from "../src/lib/provider-mode.js"

describe("isProviderModeSelectable", () => {
  it("allows chrome-ai and demo", () => {
    expect(isProviderModeSelectable("chrome-ai")).toBe(true)
    expect(isProviderModeSelectable("demo")).toBe(true)
  })

  it("disables cloud providers until coming soon is lifted", () => {
    expect(isProviderModeSelectable("openai")).toBe(false)
    expect(isProviderModeSelectable("claude")).toBe(false)
  })
})

describe("readStoredProviderMode", () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns selectable stored modes", () => {
    storeProviderMode("demo")
    expect(readStoredProviderMode()).toBe("demo")
  })

  it("returns null when stored mode is no longer selectable", () => {
    localStorage.setItem(PROVIDER_MODE_STORAGE_KEY, "openai")
    expect(readStoredProviderMode()).toBe(null)
    localStorage.setItem(PROVIDER_MODE_STORAGE_KEY, "claude")
    expect(readStoredProviderMode()).toBe(null)
  })
})
