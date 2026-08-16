import type { ReactFlowStepStatus } from "@executioncontrolprotocol/format-reactflow"

/** Map of step id → run status. */
export type StepStatusMap = Record<string, ReactFlowStepStatus>

/**
 * Reset all known step ids to pending when a run starts.
 * @category Demo
 */
export function resetStepStatuses(stepIds: string[]): StepStatusMap {
  const next: StepStatusMap = {}
  for (const id of stepIds) {
    next[id] = "pending"
  }
  return next
}

/**
 * Apply a single step status update.
 * @category Demo
 */
export function applyStepStatus(
  current: StepStatusMap,
  stepId: string,
  status: ReactFlowStepStatus
): StepStatusMap {
  return { ...current, [stepId]: status }
}

/**
 * Derive edge visual status from endpoint step statuses.
 * Idle = solid blue; incomplete = in-flight ants; completed = source step done.
 * @category Demo
 */
export function edgeRunStatus(
  sourceStatus: ReactFlowStepStatus | undefined,
  targetStatus: ReactFlowStepStatus | undefined,
  runActive: boolean
): "idle" | "incomplete" | "completed" {
  void targetStatus
  if (sourceStatus === "completed") return "completed"
  if (runActive && (sourceStatus === "pending" || sourceStatus === "running")) {
    return "incomplete"
  }
  return "idle"
}

/**
 * CSS class for a step node border during/after a run.
 * @category Demo
 */
export function stepNodeStatusClass(
  status: ReactFlowStepStatus | undefined,
  runActive: boolean
): string {
  if (status === "completed") return "ecp-rf-node--completed"
  if (status === "failed") return "ecp-rf-node--failed"
  if (status === "running") return "ecp-rf-node--running"
  if (runActive && status === "pending") return "ecp-rf-node--pending"
  return ""
}

/**
 * CSS class for an edge during/after a run.
 * @category Demo
 */
export function edgeStatusClass(
  sourceStatus: ReactFlowStepStatus | undefined,
  targetStatus: ReactFlowStepStatus | undefined,
  runActive: boolean
): string {
  const kind = edgeRunStatus(sourceStatus, targetStatus, runActive)
  if (kind === "completed") return "ecp-rf-edge--completed"
  if (kind === "incomplete") return "ecp-rf-edge--incomplete"
  return "ecp-rf-edge--idle"
}
