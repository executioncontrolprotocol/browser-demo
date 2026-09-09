import { describe, expect, it, vi } from "vitest"
import type { RunResult } from "@executioncontrolprotocol/types"
import { reactFlowRunProgress } from "@executioncontrolprotocol/format-reactflow"
import {
  emitRunProgressFailed,
  historyStatusToCanvas,
  isFailedRunResult,
  collectRunFailureMessages,
  stepErrorMessage,
  syncRunProgressFromResult,
} from "../src/lib/run-progress-sync.js"

describe("run-progress-sync", () => {
  it("maps history statuses to canvas statuses", () => {
    expect(historyStatusToCanvas("completed")).toBe("completed")
    expect(historyStatusToCanvas("failed")).toBe("failed")
    expect(historyStatusToCanvas("cancelled")).toBeUndefined()
    expect(historyStatusToCanvas("paused")).toBeUndefined()
  })

  it("extracts step error messages from diagnostics", () => {
    expect(
      stepErrorMessage({
        status: "failed",
        diagnostics: [{ severity: "error", code: "STEP_FAILED", message: "boom" }],
      })
    ).toBe("boom")
  })

  it("detects failed run results", () => {
    expect(isFailedRunResult({ error: "validation failed" })).toBe(true)
    expect(
      isFailedRunResult({
        schema: "@executioncontrolprotocol.run.result",
        version: "1.0",
        run: { id: "r1", status: "failed" },
      } satisfies RunResult)
    ).toBe(true)
    expect(
      isFailedRunResult({
        schema: "@executioncontrolprotocol.run.result",
        version: "1.0",
        run: { id: "r1", status: "completed" },
      } satisfies RunResult)
    ).toBe(false)
  })

  it("collects failure messages from thrown errors and step history", () => {
    expect(collectRunFailureMessages({ error: "boom" })).toEqual(["boom"])
    expect(
      collectRunFailureMessages({
        schema: "@executioncontrolprotocol.run.result",
        version: "1.0",
        run: { id: "r1", status: "failed" },
        history: {
          echo: {
            status: "failed",
            diagnostics: [{ severity: "error", code: "STEP_FAILED", message: "capability failed" }],
          },
        },
      })
    ).toEqual(["echo: capability failed"])
  })

  it("collects run-level returns validation diagnostics", () => {
    expect(
      collectRunFailureMessages({
        schema: "@executioncontrolprotocol.run.result",
        version: "1.0",
        run: { id: "r1", status: "failed" },
        output: { response: { text: "hi" } },
        diagnostics: [
          {
            code: "WORKFLOW_RETURNS_INVALID",
            message: "Workflow returns validation failed: Property 'response' expected type string",
            severity: "error",
            path: "workflow.returns",
          },
        ],
      })
    ).toEqual([
      "Workflow returns validation failed: Property 'response' expected type string",
    ])
  })

  it("syncs terminal history to the progress bus", () => {
    const statuses: Array<{ stepId: string; status: string; message?: string }> = []
    let doneOutcome: string | undefined
    const onStatus = (ev: Event) => {
      statuses.push((ev as CustomEvent).detail)
    }
    const onDone = (ev: Event) => {
      doneOutcome = (ev as CustomEvent<{ outcome?: string }>).detail.outcome
    }
    reactFlowRunProgress.addEventListener("step:status", onStatus)
    reactFlowRunProgress.addEventListener("run:done", onDone)
    syncRunProgressFromResult({
      schema: "@executioncontrolprotocol.run.result",
      version: "1.0",
      run: { id: "run-1", status: "failed" },
      history: {
        echo: {
          status: "failed",
          diagnostics: [{ severity: "error", code: "STEP_FAILED", message: "capability failed" }],
        },
      },
    })
    reactFlowRunProgress.removeEventListener("step:status", onStatus)
    reactFlowRunProgress.removeEventListener("run:done", onDone)
    expect(statuses).toEqual([
      { stepId: "echo", status: "failed", message: "capability failed" },
    ])
    expect(doneOutcome).toBe("failed")
  })

  it("emits failed run done without a result", () => {
    const onDone = vi.fn()
    reactFlowRunProgress.addEventListener("run:done", onDone)
    emitRunProgressFailed("run-2")
    reactFlowRunProgress.removeEventListener("run:done", onDone)
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { runId: "run-2", outcome: "failed" },
      })
    )
  })
})
