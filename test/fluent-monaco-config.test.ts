import { describe, expect, it } from "vitest"
import { FLUENT_BROWSER_MODULE_LIB } from "../src/lib/fluent-monaco-config.js"

describe("FLUENT_BROWSER_MODULE_LIB", () => {
  it("declares @executioncontrolprotocol/browser for Monaco editor", () => {
    expect(FLUENT_BROWSER_MODULE_LIB).toContain('declare module "@executioncontrolprotocol/browser"')
    expect(FLUENT_BROWSER_MODULE_LIB).toContain("export function workflow")
    expect(FLUENT_BROWSER_MODULE_LIB).toContain("export function step")
  })
})
