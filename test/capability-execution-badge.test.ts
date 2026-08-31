import { describe, expect, it } from "vitest"
import { capabilityExecutionMap, capabilityHostBadge } from "../src/lib/capability-execution-badge.js"
import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"

describe("capabilityHostBadge", () => {
  it("is silent for local capabilities", () => {
    expect(capabilityHostBadge("local", false)).toBeUndefined()
    expect(capabilityHostBadge(undefined, false)).toBeUndefined()
  })

  it("asks for ecp up when host or mixed is unpaired", () => {
    expect(capabilityHostBadge("host", false)).toBe("Local host required")
    expect(capabilityHostBadge("mixed", false)).toBe("Local host required")
  })

  it("notes mixed still runs in the tab when paired", () => {
    expect(capabilityHostBadge("mixed", true)).toBe("Runs in tab (local host required)")
    expect(capabilityHostBadge("host", true)).toBe("Runs on local host")
  })

  it("indexes describe() execution by capability id", () => {
    const descriptor = {
      capabilities: [
        { id: "a.host", execution: "host" },
        { id: "b.local" },
      ],
    } as EnvironmentDescriptor
    expect(capabilityExecutionMap(descriptor)).toEqual({ "a.host": "host" })
    expect(capabilityExecutionMap(null)).toEqual({})
  })
})
