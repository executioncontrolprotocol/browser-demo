import { describe, expect, it } from "vitest"
import {
  applyStepStatus,
  edgeRunStatus,
  edgeStatusClass,
  resetStepStatuses,
  stepNodeStatusClass,
} from "../src/lib/reactflow-run-status.js"

describe("reactflow-run-status", () => {
  it("resets all steps to pending", () => {
    expect(resetStepStatuses(["a", "b"])).toEqual({ a: "pending", b: "pending" })
  })

  it("applies a step status update", () => {
    const next = applyStepStatus({ a: "pending" }, "a", "completed")
    expect(next).toEqual({ a: "completed" })
  })

  it("keeps edges idle until a run starts, then ants until source completes", () => {
    expect(edgeRunStatus(undefined, undefined, false)).toBe("idle")
    expect(edgeRunStatus("pending", "pending", true)).toBe("incomplete")
    expect(edgeRunStatus("running", "pending", true)).toBe("incomplete")
    expect(edgeRunStatus("completed", "pending", true)).toBe("completed")
    expect(edgeRunStatus("completed", "completed", false)).toBe("completed")
  })

  it("maps node status to CSS classes", () => {
    expect(stepNodeStatusClass("completed", true)).toBe("ecp-rf-node--completed")
    expect(stepNodeStatusClass("running", true)).toBe("ecp-rf-node--running")
    expect(stepNodeStatusClass("pending", true)).toBe("ecp-rf-node--pending")
    expect(stepNodeStatusClass(undefined, false)).toBe("")
  })

  it("maps edge status to CSS classes", () => {
    expect(edgeStatusClass(undefined, undefined, false)).toBe("ecp-rf-edge--idle")
    expect(edgeStatusClass("completed", "completed", true)).toBe("ecp-rf-edge--completed")
    expect(edgeStatusClass("completed", "running", true)).toBe("ecp-rf-edge--completed")
    expect(edgeStatusClass("pending", "pending", true)).toBe("ecp-rf-edge--incomplete")
  })
})
