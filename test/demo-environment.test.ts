import { describe, expect, it } from "vitest"
import { createDemoAppEnvironment } from "../src/lib/demo-environment.js"

describe("createDemoAppEnvironment", () => {
  it("binds @executioncontextprotocol/test so @executioncontextprotocol/test.echo appears in describe()", async () => {
    const { descriptor } = await createDemoAppEnvironment()
    const ids = descriptor.capabilities.map((c) => c.id)
    expect(ids).toContain("@executioncontextprotocol/test.echo")
    expect(descriptor.extensions.some((e) => e.id === "@executioncontextprotocol/test")).toBe(true)
  })
})
