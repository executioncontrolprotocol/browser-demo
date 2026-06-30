import { describe, expect, it } from "vitest"
import { environmentSourceFromDescriptor } from "../src/lib/environment-source.js"
import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"

const SAMPLE: EnvironmentDescriptor = {
  schema: "@executioncontrolprotocol.environment.describe",
  version: "1.0.0",
  environment: { id: "browser-demo-app", label: "Browser demo" },
  runtime: { id: "@executioncontrolprotocol/browser", features: {} },
  extensions: [
    { id: "@executioncontrolprotocol/test", order: 0, capabilities: ["@executioncontrolprotocol/test.echo"] },
    { id: "@executioncontrolprotocol/format-toon", order: 1, capabilities: [] },
  ],
  capabilities: [],
  policies: [],
}

describe("environmentSourceFromDescriptor", () => {
  it("returns placeholder when descriptor is null", () => {
    const src = environmentSourceFromDescriptor(null)
    expect(src).toContain("@executioncontrolprotocol/browser")
    expect(src).toContain("browser-demo-app")
  })

  it("generates extension bindings from descriptor", () => {
    const src = environmentSourceFromDescriptor(SAMPLE)
    expect(src).toContain('environment("browser-demo-app", "Browser demo")')
    expect(src).toContain('extension("@executioncontrolprotocol/test")')
    expect(src).toContain('extension("@executioncontrolprotocol/format-toon")')
    expect(src).toContain("View only")
  })
})
