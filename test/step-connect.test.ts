import { describe, expect, it } from "vitest"
import type { StepNode } from "@executioncontrolprotocol/types"
import {
  OUTPUT_HANDLE_ID,
  applyPortConnection,
  buildStateRefFromConnection,
  portTypeKind,
  portsAreCompatible,
  removePortBinding,
  resolvePortConnection,
} from "../src/lib/step-connect.js"

describe("step-connect helpers", () => {
  it("builds state refs from as + handle", () => {
    expect(
      buildStateRefFromConnection({ sourceAs: "summary", sourceHandle: OUTPUT_HANDLE_ID })
    ).toEqual({ ok: true, refPath: "state.summary" })
    expect(
      buildStateRefFromConnection({ sourceAs: "summary", sourceHandle: "text" })
    ).toEqual({ ok: true, refPath: "state.summary.text" })
  })

  it("rejects connect when source has no as key", () => {
    const result = buildStateRefFromConnection({ sourceAs: undefined, sourceHandle: "text" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/store key \(as\)/i)
    }
  })

  it("resolves output→input connections with optional allowlist", () => {
    expect(
      resolvePortConnection({
        sourceAs: "summary",
        sourceHandle: "text",
        targetHandle: "prompt",
        allowedTargetParams: ["prompt", "system"],
      })
    ).toEqual({ ok: true, refPath: "state.summary.text", paramName: "prompt" })

    expect(
      resolvePortConnection({
        sourceAs: "summary",
        sourceHandle: "text",
        targetHandle: "nope",
        allowedTargetParams: ["prompt"],
      }).ok
    ).toBe(false)
  })

  it("applies a connection by replacing literals with $ref", () => {
    const step: StepNode = {
      id: "reply",
      uses: "@x/reply",
      input: { text: "static", keep: 1 },
    }
    const next = applyPortConnection(step, "text", "state.summary.text")
    expect(next.input).toEqual({
      text: { $ref: "state.summary.text" },
      keep: 1,
    })
  })

  it("normalizes ref paths without state. prefix", () => {
    const step: StepNode = { id: "r", uses: "@x/y", input: {} }
    expect(applyPortConnection(step, "prompt", "summary.text").input).toEqual({
      prompt: { $ref: "state.summary.text" },
    })
  })

  it("removes a port binding and clears empty input", () => {
    const step: StepNode = {
      id: "reply",
      uses: "@x/reply",
      input: { text: { $ref: "state.summary.text" }, keep: true },
    }
    const afterOne = removePortBinding(step, "text")
    expect(afterOne.input).toEqual({ keep: true })

    const afterAll = removePortBinding(
      { id: "reply", uses: "@x/reply", input: { text: { $ref: "state.a" } } },
      "text"
    )
    expect(afterAll.input).toBeUndefined()
  })

  it("maps valueSchema and typeLabel to port type kinds", () => {
    expect(portTypeKind({ valueSchema: { type: "string" } })).toBe("string")
    expect(portTypeKind({ valueSchema: { type: "integer" } })).toBe("number")
    expect(portTypeKind({ valueSchema: { type: "number" } })).toBe("number")
    expect(portTypeKind({ valueSchema: { type: "boolean" } })).toBe("boolean")
    expect(portTypeKind({ valueSchema: { type: "object" } })).toBe("object")
    expect(portTypeKind({ valueSchema: { type: "array" } })).toBe("array")
    expect(portTypeKind({ valueSchema: {} })).toBe("unknown")
    expect(portTypeKind({ typeLabel: "string!" })).toBe("string")
    expect(portTypeKind({ typeLabel: "unknown" })).toBe("unknown")
    expect(portTypeKind({})).toBe("unknown")
  })

  it("allows compatible kinds and rejects cross-kind pairs", () => {
    expect(
      portsAreCompatible(
        { valueSchema: { type: "string" } },
        { valueSchema: { type: "string", enum: ["a", "b"] } }
      )
    ).toBe(true)
    expect(
      portsAreCompatible(
        { valueSchema: { type: "number" } },
        { valueSchema: { type: "integer" } }
      )
    ).toBe(true)
    expect(
      portsAreCompatible({ valueSchema: { type: "string" } }, { valueSchema: { type: "number" } })
    ).toBe(false)
    expect(
      portsAreCompatible({ valueSchema: { type: "object" } }, { valueSchema: { type: "array" } })
    ).toBe(false)
    expect(portsAreCompatible({ valueSchema: {} }, { valueSchema: { type: "string" } })).toBe(true)
    expect(portsAreCompatible({ typeLabel: "unknown" }, { typeLabel: "number" })).toBe(true)
  })
})
