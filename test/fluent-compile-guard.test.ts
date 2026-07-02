import { describe, expect, it } from "vitest"

/** Mirrors App.tsx placeholder guard for Fluent compile-on-edit. */
function shouldCompileFluentSource(source: string | undefined): boolean {
  if (source === undefined) return false
  const trimmed = source.trim()
  if (!trimmed || trimmed.startsWith("// Fluent API will appear here")) return false
  return true
}

describe("shouldCompileFluentSource", () => {
  it("skips empty and placeholder source", () => {
    expect(shouldCompileFluentSource(undefined)).toBe(false)
    expect(shouldCompileFluentSource("")).toBe(false)
    expect(shouldCompileFluentSource("// Fluent API will appear here")).toBe(false)
  })

  it("allows workflow source", () => {
    expect(
      shouldCompileFluentSource('export default workflow("Demo").run([]);')
    ).toBe(true)
  })
})
