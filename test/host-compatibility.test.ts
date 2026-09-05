import { describe, expect, it } from "vitest"
import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"
import {
  checkHostMixedCompatibility,
  mergeValidationResults,
} from "../src/lib/host-compatibility.js"

function desc(
  caps: Array<{ id: string; execution?: "local" | "host" | "mixed" }>
): EnvironmentDescriptor {
  return {
    schema: "@executioncontrolprotocol.environment.describe",
    version: "1.0.0",
    environment: { id: "t" },
    runtime: { id: "@executioncontrolprotocol/browser", features: {} },
    extensions: [],
    capabilities: caps.map((c) => ({
      id: c.id,
      extensionId: c.id.split(".").slice(0, -1).join(".") || c.id,
      ...(c.execution ? { execution: c.execution } : {}),
    })),
    policies: [],
  }
}

describe("checkHostMixedCompatibility", () => {
  it("is valid when unpaired", () => {
    const browser = desc([
      { id: "@executioncontrolprotocol/image-sharp.inspect", execution: "host" },
    ])
    expect(checkHostMixedCompatibility(browser, null).valid).toBe(true)
  })

  it("is valid when host has all host/mixed caps", () => {
    const browser = desc([
      { id: "@executioncontrolprotocol/chrome-ai.generate", execution: "local" },
      { id: "@executioncontrolprotocol/image-sharp.inspect", execution: "host" },
      { id: "@executioncontrolprotocol/azure-blob-storage.upload", execution: "mixed" },
    ])
    const host = desc([
      { id: "@executioncontrolprotocol/image-sharp.inspect", execution: "host" },
      { id: "@executioncontrolprotocol/azure-blob-storage.upload", execution: "mixed" },
      { id: "@executioncontrolprotocol/azure-blob-storage.create-sas-url", execution: "host" },
    ])
    expect(checkHostMixedCompatibility(browser, host).valid).toBe(true)
  })

  it("errors when host is missing host or mixed caps", () => {
    const browser = desc([
      { id: "@executioncontrolprotocol/image-sharp.inspect", execution: "host" },
      {
        id: "@executioncontrolprotocol/adobe-firefly-services.photoshop-generate-manifest",
        execution: "host",
      },
    ])
    const host = desc([
      { id: "@executioncontrolprotocol/ollama.generate", execution: "host" },
    ])
    const result = checkHostMixedCompatibility(browser, host)
    expect(result.valid).toBe(false)
    expect(result.errors.map((e) => e.code)).toEqual([
      "HOST_CAPABILITY_MISSING",
      "HOST_CAPABILITY_MISSING",
    ])
    expect(result.errors[0]?.message).toMatch(/image-sharp\.inspect/)
  })
})

describe("mergeValidationResults", () => {
  it("prefers host-compat errors when present", () => {
    const host = checkHostMixedCompatibility(
      desc([{ id: "@x/y.z", execution: "host" }]),
      desc([])
    )
    const workflow = {
      schema: "@executioncontrolprotocol.validation.result" as const,
      version: "1.0" as const,
      valid: false,
      errors: [{ code: "W", message: "workflow" }],
      warnings: [],
    }
    const merged = mergeValidationResults(workflow, host)
    expect(merged?.valid).toBe(false)
    expect(merged?.errors[0]?.code).toBe("HOST_CAPABILITY_MISSING")
    expect(merged?.errors.some((e) => e.code === "W")).toBe(true)
  })
})
