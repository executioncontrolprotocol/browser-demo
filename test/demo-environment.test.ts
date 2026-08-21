import { describe, expect, it } from "vitest"
import { createDemoAppEnvironment } from "../src/lib/demo-environment.js"

describe("createDemoAppEnvironment", () => {
  it("binds chrome-ai.generate, ollama.generate, and not @executioncontrolprotocol/test.*", async () => {
    const { descriptor } = await createDemoAppEnvironment()
    const ids = descriptor.capabilities.map((c) => c.id)
    expect(ids).toContain("@executioncontrolprotocol/chrome-ai.generate")
    expect(ids).toContain("@executioncontrolprotocol/ollama.generate")
    expect(ids).not.toContain("@browser-demo/bridge-ollama.generate")
    expect(ids.some((id) => id.startsWith("@executioncontrolprotocol/test."))).toBe(false)
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/test")).toBe(false)
    expect(descriptor.remoteInvoke).toBeUndefined()
  })

  it("registers formats for encode without binding them into the authoring inventory", async () => {
    const { descriptor, ecp } = await createDemoAppEnvironment()
    expect(descriptor.extensions.some((e) => e.id.includes("/format-"))).toBe(false)
    expect(descriptor.capabilities.some((c) => c.id.includes("/format-"))).toBe(false)
    const encoded = await ecp
      .encode({
        schema: "@executioncontrolprotocol.workflow",
        version: "1.0.0",
        workflow: { id: "t", label: "T" },
        steps: [],
      })
      .uses("@executioncontrolprotocol/format-reactflow")
      .process()
    expect(encoded.success).toBe(true)
  })

  it("binds fal and image-sharp as host workflow inventory (chrome-ai stays local)", async () => {
    const { descriptor } = await createDemoAppEnvironment()
    const chrome = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/chrome-ai.generate"
    )
    expect(chrome?.execution).toBe("local")
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/fal")).toBe(true)
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/image-sharp")).toBe(
      true
    )
    const fal = descriptor.capabilities.find((c) => c.id === "@executioncontrolprotocol/fal.generate")
    expect(fal?.execution).toBe("host")
    const sharp = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/image-sharp.inspect"
    )
    expect(sharp?.execution).toBe("host")
  })

  it("binds remoteInvoke from pairing without including the token", async () => {
    const { descriptor } = await createDemoAppEnvironment({
      bridge: { baseURL: "http://127.0.0.1:3090", token: "secret-token" },
    })
    expect(descriptor.remoteInvoke).toEqual({ url: "http://127.0.0.1:3090" })
    expect(JSON.stringify(descriptor)).not.toContain("secret-token")
    const ollama = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/ollama.generate"
    )
    expect(ollama?.execution).toBe("host")
  })
})
