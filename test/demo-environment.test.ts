import { describe, expect, it } from "vitest"
import { createDemoAppEnvironment } from "../src/lib/demo-environment.js"

describe("createDemoAppEnvironment", () => {
  it("binds @executioncontrolprotocol/demo so @executioncontrolprotocol/demo.echo appears in describe()", async () => {
    const { descriptor } = await createDemoAppEnvironment()
    const ids = descriptor.capabilities.map((c) => c.id)
    expect(ids).toContain("@executioncontrolprotocol/demo.echo")
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/demo")).toBe(true)
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/test")).toBe(false)
  })
})
