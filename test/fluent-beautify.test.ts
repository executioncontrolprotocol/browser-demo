import { describe, expect, it } from "vitest"
import {
  formatFluentManifest,
  shouldBeautifyFluentSource,
} from "../src/lib/fluent-beautify.js"
import { workflow } from "@executioncontrolprotocol/core/browser"

describe("shouldBeautifyFluentSource", () => {
  it("skips empty and placeholder source", () => {
    expect(shouldBeautifyFluentSource(undefined)).toBe(false)
    expect(shouldBeautifyFluentSource("")).toBe(false)
    expect(shouldBeautifyFluentSource("// Fluent API will appear here")).toBe(false)
  })

  it("allows workflow source", () => {
    expect(
      shouldBeautifyFluentSource('export default workflow("Demo").run([]);')
    ).toBe(true)
  })
})

describe("formatFluentManifest", () => {
  it("expands accepts and returns schemas across multiple lines", () => {
    const manifest = workflow("Echo")
      .accepts({
        type: "object",
        properties: {
          value: { type: "string", minLength: 3 },
          mode: { type: "string", enum: ["fast", "slow"] },
        },
        required: ["value"],
      })
      .returns({
        type: "object",
        properties: { echo: { type: "object" } },
        required: ["echo"],
      })
      .run([])
      .toManifest()

    const fluent = formatFluentManifest(manifest)
    expect(fluent).toMatch(/\.accepts\(\{\n/)
    expect(fluent).toMatch(/\.returns\(\{\n/)
    expect(fluent).toContain('"minLength": 3')
    expect(fluent).toContain('"enum": [')
    expect(fluent).not.toContain('.accepts({"type"')
  })
})
