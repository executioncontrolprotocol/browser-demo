import { describe, expect, it } from "vitest"
import {
  formatOllamaListError,
  pickOllamaModelFromList,
} from "../src/lib/ollama-models.js"
import { DEFAULT_OLLAMA_SETTINGS } from "../src/lib/ollama-settings.js"
import { canContinueFirstRun } from "../src/lib/provider-mode.js"

describe("pickOllamaModelFromList", () => {
  it("keeps the current model when it is listed", () => {
    expect(
      pickOllamaModelFromList(["gemma3:1b", "qwen2.5-coder:7b"], "qwen2.5-coder:7b")
    ).toBe("qwen2.5-coder:7b")
  })

  it("prefers the coding default when current is missing", () => {
    expect(pickOllamaModelFromList(["gemma3:1b", DEFAULT_OLLAMA_SETTINGS.model], "missing")).toBe(
      DEFAULT_OLLAMA_SETTINGS.model
    )
  })

  it("falls back to the first listed tag", () => {
    expect(pickOllamaModelFromList(["gemma3:1b", "llama3:8b"], "missing")).toBe("gemma3:1b")
  })

  it("returns undefined for an empty list", () => {
    expect(pickOllamaModelFromList([], "anything")).toBeUndefined()
  })
})

describe("formatOllamaListError", () => {
  it("adds an OLLAMA_ORIGINS hint for failed fetch / CORS-like errors", () => {
    const message = formatOllamaListError(new Error("Failed to fetch"))
    expect(message).toContain("Failed to fetch")
    expect(message).toContain("OLLAMA_ORIGINS")
  })
})

describe("canContinueFirstRun", () => {
  it("blocks Continue for Ollama until listing is ready with a model", () => {
    expect(
      canContinueFirstRun("ollama", {
        chromeSupported: true,
        ollamaReady: false,
        ollamaModel: "qwen2.5-coder:1.5b",
      })
    ).toBe(false)
    expect(
      canContinueFirstRun("ollama", {
        chromeSupported: true,
        ollamaReady: true,
        ollamaModel: "",
      })
    ).toBe(false)
    expect(
      canContinueFirstRun("ollama", {
        chromeSupported: false,
        ollamaReady: true,
        ollamaModel: "qwen2.5-coder:1.5b",
      })
    ).toBe(true)
  })

  it("still requires Chrome support for chrome-ai", () => {
    expect(
      canContinueFirstRun("chrome-ai", {
        chromeSupported: false,
        ollamaReady: true,
        ollamaModel: "x",
      })
    ).toBe(false)
    expect(
      canContinueFirstRun("chrome-ai", {
        chromeSupported: true,
        ollamaReady: false,
        ollamaModel: "",
      })
    ).toBe(true)
  })
})
