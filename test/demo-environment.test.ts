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

  it("keeps chrome-ai local and does not bind unpublished vendor packages", async () => {
    const { descriptor } = await createDemoAppEnvironment()
    const chrome = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/chrome-ai.generate"
    )
    expect(chrome?.execution).toBe("local")
    // fal / image-sharp are host-side via `ecp up` + npm link — not committed deps.
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/fal")).toBe(false)
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/image-sharp")).toBe(
      false
    )
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
