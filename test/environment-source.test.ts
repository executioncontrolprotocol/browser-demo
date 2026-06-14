import { describe, expect, it } from "vitest"
import { environmentSourceFromDescriptor } from "../src/lib/environment-source.js"
import type { EnvironmentDescriptor } from "@executioncontextprotocol/types"

const SAMPLE: EnvironmentDescriptor = {
  schema: "@ecp.environment.describe",
  version: "1.0.0",
  environment: { id: "browser-demo-app", label: "Browser demo" },
  runtime: { id: "@executioncontextprotocol/browser", features: {} },
  extensions: [
    { id: "@executioncontextprotocol/test", order: 0, capabilities: ["@executioncontextprotocol/test.echo"] },
    { id: "@executioncontextprotocol/format-toon", order: 1, capabilities: [] },
  ],
  capabilities: [],
  policies: [],
}

describe("environmentSourceFromDescriptor", () => {
  it("returns placeholder when descriptor is null", () => {
    const src = environmentSourceFromDescriptor(null)
    expect(src).toContain("@executioncontextprotocol/browser")
    expect(src).toContain("browser-demo-app")
  })

  it("generates extension bindings from descriptor", () => {
    const src = environmentSourceFromDescriptor(SAMPLE)
    expect(src).toContain('environment("browser-demo-app", "Browser demo")')
    expect(src).toContain('extension("@executioncontextprotocol/test")')
    expect(src).toContain('extension("@executioncontextprotocol/format-toon")')
    expect(src).toContain("View only")
  })
})
