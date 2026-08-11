import { describe, expect, it, beforeEach } from "vitest"
import {
  DEFAULT_OLLAMA_SETTINGS,
  OLLAMA_SETTINGS_STORAGE_KEY,
  readOllamaSettings,
  storeOllamaSettings,
} from "../src/lib/ollama-settings.js"

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

describe("ollama settings", () => {
  beforeEach(() => {
    installMemoryLocalStorage()
    localStorage.clear()
  })

  it("defaults to localhost and qwen coding model", () => {
    expect(readOllamaSettings()).toEqual(DEFAULT_OLLAMA_SETTINGS)
    expect(DEFAULT_OLLAMA_SETTINGS.baseURL).toBe("http://localhost:11434")
    expect(DEFAULT_OLLAMA_SETTINGS.model).toBe("qwen2.5-coder:1.5b")
  })

  it("round-trips custom settings", () => {
    storeOllamaSettings({
      baseURL: "http://127.0.0.1:11434",
      model: "qwen2.5-coder:7b",
    })
    expect(readOllamaSettings()).toEqual({
      baseURL: "http://127.0.0.1:11434",
      model: "qwen2.5-coder:7b",
    })
    expect(localStorage.getItem(OLLAMA_SETTINGS_STORAGE_KEY)).toContain("qwen2.5-coder:7b")
  })
})
