import { describe, expect, it } from "vitest"
import { toAuthoringEnvironmentDescriptor } from "@executioncontrolprotocol/core"
import { createDemoAppEnvironment } from "../src/lib/demo-environment.js"
import {
  isDemoEnvPreset,
  parseDemoEnvPresetQuery,
  readDemoEnvPreset,
  storeDemoEnvPreset,
} from "../src/lib/demo-env-preset.js"

const WORKFLOW_PROVIDER_EXTENSIONS = [
  "@executioncontrolprotocol/chrome-ai",
  "@executioncontrolprotocol/claude",
  "@executioncontrolprotocol/fal",
  "@executioncontrolprotocol/image-sharp",
  "@executioncontrolprotocol/jsonata",
  "@executioncontrolprotocol/ollama",
  "@executioncontrolprotocol/openai",
] as const

describe("demo env preset", () => {
  it("parses query and rejects unknown values", () => {
    expect(parseDemoEnvPresetQuery("?env=extended")).toBe("extended")
    expect(parseDemoEnvPresetQuery("?env=default")).toBe("default")
    expect(parseDemoEnvPresetQuery("?env=nope")).toBeUndefined()
    expect(isDemoEnvPreset("extended")).toBe(true)
    expect(isDemoEnvPreset("other")).toBe(false)
  })

  it("defaults to default when localStorage is unavailable", () => {
    expect(readDemoEnvPreset()).toBe("default")
    storeDemoEnvPreset("extended")
    // Node test env has no localStorage — store is a no-op; read stays default.
    expect(readDemoEnvPreset()).toBe("default")
  })
})

describe("createDemoAppEnvironment", () => {
  it("binds chrome-ai.generate, ollama.generate, and not @executioncontrolprotocol/test.*", async () => {
    const { descriptor, preset } = await createDemoAppEnvironment({ preset: "default" })
    expect(preset).toBe("default")
    const ids = descriptor.capabilities.map((c) => c.id)
    expect(ids).toContain("@executioncontrolprotocol/chrome-ai.generate")
    expect(ids).toContain("@executioncontrolprotocol/ollama.generate")
    expect(ids).not.toContain("@browser-demo/bridge-ollama.generate")
    expect(ids.some((id) => id.startsWith("@executioncontrolprotocol/test."))).toBe(false)
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/test")).toBe(false)
    expect(descriptor.remoteInvoke).toBeUndefined()
  })

  it("registers formats for encode; binds format-reactflow only for canvas run progress", async () => {
    const { descriptor, ecp } = await createDemoAppEnvironment({ preset: "default" })
    const formatExtensions = descriptor.extensions.filter((e) => e.id.includes("/format-"))
    expect(formatExtensions.map((e) => e.id)).toEqual(["@executioncontrolprotocol/format-reactflow"])
    expect(descriptor.capabilities.some((c) => c.id.includes("/format-"))).toBe(true)
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

  it("binds workflow providers and excludes format/browser/bridge from authoring inventory", async () => {
    const { descriptor } = await createDemoAppEnvironment({ preset: "default" })
    const chrome = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/chrome-ai.generate"
    )
    expect(chrome?.execution).toBe("local")
    for (const id of WORKFLOW_PROVIDER_EXTENSIONS) {
      expect(descriptor.extensions.some((e) => e.id === id)).toBe(true)
    }
    const fal = descriptor.capabilities.find((c) => c.id === "@executioncontrolprotocol/fal.generate")
    expect(fal?.execution).toBe("host")
    const sharp = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/image-sharp.inspect"
    )
    expect(sharp?.execution).toBe("host")
    const jsonata = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/jsonata.transform"
    )
    expect(jsonata?.execution).toBe("local")

    const authoring = toAuthoringEnvironmentDescriptor(descriptor)
    expect(authoring.extensions.map((e) => e.id).sort()).toEqual([...WORKFLOW_PROVIDER_EXTENSIONS])
    expect(authoring.extensions.some((e) => e.id.includes("/format-"))).toBe(false)
    expect(authoring.extensions.some((e) => e.id.startsWith("@executioncontrolprotocol/browser-"))).toBe(
      false
    )
    expect(authoring.extensions.some((e) => e.id.startsWith("@browser-demo/"))).toBe(false)
    expect(authoring.capabilities.some((c) => c.id.includes("/format-"))).toBe(false)
    expect(authoring.capabilities.map((c) => c.id)).toContain(
      "@executioncontrolprotocol/chrome-ai.generate"
    )
    expect(authoring.capabilities.map((c) => c.id)).toContain(
      "@executioncontrolprotocol/fal.generate"
    )
    expect(authoring.capabilities.map((c) => c.id)).toContain(
      "@executioncontrolprotocol/jsonata.transform"
    )
  })

  it("binds remoteInvoke from pairing without including the token", async () => {
    const { descriptor } = await createDemoAppEnvironment({
      preset: "default",
      bridge: { baseURL: "http://127.0.0.1:3090", token: "secret-token" },
    })
    expect(descriptor.remoteInvoke).toEqual({ url: "http://127.0.0.1:3090" })
    expect(JSON.stringify(descriptor)).not.toContain("secret-token")
    const ollama = descriptor.capabilities.find(
      (c) => c.id === "@executioncontrolprotocol/ollama.generate"
    )
    expect(ollama?.execution).toBe("host")
  })

  it("extended preset binds Azure and Adobe when vendors are linked", async () => {
    const { isExtendedDemoEnvAvailable, createDemoAppEnvironment: create } = await import(
      "../src/lib/demo-environment.js"
    )
    const available = await isExtendedDemoEnvAvailable()
    if (!available) {
      await expect(create({ preset: "extended" })).rejects.toThrow(/link:vendor/)
      return
    }
    const { descriptor, preset } = await create({ preset: "extended" })
    expect(preset).toBe("extended")
    expect(descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/azure-blob-storage")).toBe(
      true
    )
    expect(
      descriptor.extensions.some((e) => e.id === "@executioncontrolprotocol/adobe-firefly-services")
    ).toBe(true)
    expect(
      descriptor.capabilities.some(
        (c) => c.id === "@executioncontrolprotocol/azure-blob-storage.upload"
      )
    ).toBe(true)
    expect(
      descriptor.capabilities.some((c) =>
        c.id.startsWith("@executioncontrolprotocol/adobe-firefly-services.photoshop-")
      )
    ).toBe(true)
  })
})
