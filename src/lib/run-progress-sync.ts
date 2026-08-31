import {
  reactFlowRunProgress,
  type ReactFlowRunLifecycleDetail,
  type ReactFlowStepStatus,
} from "@executioncontrolprotocol/format-reactflow"
import type { RunResult, RunStatus, StepRunRecord } from "@executioncontrolprotocol/types"

/** Extract the primary failure message from a step history record. @category Demo */
export function stepErrorMessage(record: StepRunRecord): string | undefined {
  const first = record.diagnostics?.find((d) => d.severity === "error") ?? record.diagnostics?.[0]
  return first?.message
}

/** Map run history status to canvas step status. @category Demo */
export function historyStatusToCanvas(status: RunStatus): ReactFlowStepStatus | undefined {
  switch (status) {
    case "completed":
      return "completed"
    case "failed":
      return "failed"
    case "started":
      return "running"
    case "created":
      return "pending"
    case "cancelled":
    case "paused":
      return undefined
    default:
      return undefined
  }
}

function runOutcomeFromStatus(status: RunStatus): ReactFlowRunLifecycleDetail["outcome"] {
  if (status === "completed") return "completed"
  if (status === "cancelled") return "cancelled"
  return "failed"
}

/**
 * Reconcile canvas run progress from a terminal {@link RunResult}.
 * Fallback when lifecycle hooks lag or were skipped (e.g. policy deny).
 * @category Demo
 */
export function syncRunProgressFromResult(result: RunResult): void {
  const history = result.history ?? {}
  for (const [stepId, record] of Object.entries(history)) {
    const canvasStatus = historyStatusToCanvas(record.status)
    if (!canvasStatus) continue
    const message = record.status === "failed" ? stepErrorMessage(record) : undefined
    reactFlowRunProgress.emitStepStatus(stepId, canvasStatus, message)
  }
  reactFlowRunProgress.emitDone({
    runId: result.run.id,
    outcome: runOutcomeFromStatus(result.run.status),
  })
}

/** True when the run result represents a failed workflow execution. @category Demo */
export function isFailedRunResult(result: unknown): boolean {
  if (!result || typeof result !== "object") return false
  if ("error" in result && typeof (result as { error?: unknown }).error === "string") return true
  const run = (result as RunResult).run
  return run?.status === "failed" || run?.status === "cancelled"
}

/** Emit terminal failed run progress when no {@link RunResult} is available. @category Demo */
export function emitRunProgressFailed(runId?: string): void {
  reactFlowRunProgress.emitDone({ runId, outcome: "failed" })
}
