import { describe, expect, it } from "vitest"
import { createDemoAppEnvironment } from "../src/lib/demo-environment.js"

describe("createDemoAppEnvironment", () => {
  it("binds chrome-ai.generate and not @executioncontrolprotocol/test.*", async () => {
    const { descriptor } = await createDemoAppEnvironment()
    const ids = descriptor.capabilities.map((c) => c.id)
    expect(ids).toContain("@executioncontrolprotocol/chrome-ai.generate")
    expect(ids.some((id) => id.startsWith("@executioncontrolprotocol/test."))).toBe(false)
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/test")).toBe(false)
  })

  it("binds FAL and image-sharp capabilities for image workflows", async () => {
    const { descriptor } = await createDemoAppEnvironment()
    const ids = descriptor.capabilities.map((c) => c.id)
    expect(ids).toContain("@executioncontrolprotocol/fal.generate")
    expect(ids).toContain("@executioncontrolprotocol/image-sharp.inspect")
    expect(ids).toContain("@executioncontrolprotocol/image-sharp.transform")
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/fal")).toBe(true)
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/image-sharp")).toBe(true)
  })
})
