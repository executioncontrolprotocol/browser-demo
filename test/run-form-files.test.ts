import { describe, expect, it } from "vitest"
import { isRunFormFilePort } from "../src/lib/run-form-files.js"

describe("isRunFormFilePort", () => {
  it("treats image/filePath/source string ports as files", () => {
    expect(isRunFormFilePort({ id: "image", name: "image", typeLabel: "string" })).toBe(true)
    expect(isRunFormFilePort({ id: "filePath", name: "filePath", typeLabel: "string" })).toBe(true)
    expect(isRunFormFilePort({ id: "source", name: "source", typeLabel: "string" })).toBe(true)
  })

  it("ignores unrelated strings and non-strings", () => {
    expect(isRunFormFilePort({ id: "prompt", name: "prompt", typeLabel: "string" })).toBe(false)
    expect(
      isRunFormFilePort({
        id: "image",
        name: "image",
        typeLabel: "object",
        valueSchema: { type: "object" },
      })
    ).toBe(false)
  })

  it("treats contentMediaType as a file hint", () => {
    expect(
      isRunFormFilePort({
        id: "asset",
        name: "asset",
        typeLabel: "string",
        valueSchema: { type: "string", contentMediaType: "image/png" },
      })
    ).toBe(true)
  })
})
