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

  it("marks edges incomplete until both ends complete", () => {
    expect(edgeRunStatus("completed", "pending", true)).toBe("incomplete")
    expect(edgeRunStatus("completed", "completed", true)).toBe("completed")
    expect(edgeRunStatus(undefined, undefined, false)).toBe("idle")
  })

  it("maps node status to CSS classes", () => {
    expect(stepNodeStatusClass("completed", true)).toBe("ecp-rf-node--completed")
    expect(stepNodeStatusClass("running", true)).toBe("ecp-rf-node--incomplete")
    expect(stepNodeStatusClass("pending", true)).toBe("ecp-rf-node--incomplete")
    expect(stepNodeStatusClass(undefined, false)).toBe("")
  })

  it("maps edge status to CSS classes", () => {
    expect(edgeStatusClass("completed", "completed", true)).toBe("ecp-rf-edge--completed")
    expect(edgeStatusClass("completed", "running", true)).toBe("ecp-rf-edge--incomplete")
    expect(edgeStatusClass(undefined, undefined, false)).toBe("")
  })
})
