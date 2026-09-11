import { describe, expect, it, beforeEach } from "vitest"
import {
  ANTHROPIC_CHAT_FILE_ACCEPT,
  DEFAULT_ANTHROPIC_MODEL,
  isAnthropicChatFileMediaType,
  readAnthropicSettings,
  storeAnthropicSettings,
} from "../src/lib/anthropic-settings.js"

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

describe("anthropic-settings", () => {
  beforeEach(() => {
    installMemoryLocalStorage()
    localStorage.clear()
  })

  it("defaults and round-trips model", () => {
    expect(readAnthropicSettings().model).toBe(DEFAULT_ANTHROPIC_MODEL)
    storeAnthropicSettings({ model: "claude-haiku-4-5" })
    expect(readAnthropicSettings().model).toBe("claude-haiku-4-5")
  })

  it("filters chat attachment MIME types", () => {
    expect(isAnthropicChatFileMediaType("image/png")).toBe(true)
    expect(isAnthropicChatFileMediaType("application/pdf")).toBe(true)
    expect(isAnthropicChatFileMediaType("image/svg+xml")).toBe(false)
    expect(ANTHROPIC_CHAT_FILE_ACCEPT).toContain("image/png")
  })
})
