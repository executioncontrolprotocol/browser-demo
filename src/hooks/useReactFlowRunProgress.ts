import { useEffect, useState } from "react"
import {
  reactFlowRunProgress,
  type ReactFlowRunLifecycleDetail,
  type ReactFlowStepStatusDetail,
} from "@executioncontrolprotocol/format-reactflow"
import {
  applyStepStatus,
  resetStepStatuses,
  type StepStatusMap,
} from "../lib/reactflow-run-status.js"

/** Map of step id → failure message for hover tooltips. */
export type StepErrorMap = Record<string, string>

function applyStepError(
  current: StepErrorMap,
  stepId: string,
  status: ReactFlowStepStatusDetail["status"],
  message?: string
): StepErrorMap {
  if (status !== "failed" || !message) {
    if (!(stepId in current)) return current
    const next = { ...current }
    delete next[stepId]
    return next
  }
  return { ...current, [stepId]: message }
}

/** Subscribe to format-reactflow run progress for the Workflow canvas. */
export function useReactFlowRunProgress(stepIds: string[], runBusy = false) {
  const [statuses, setStatuses] = useState<StepStatusMap>({})
  const [errors, setErrors] = useState<StepErrorMap>({})
  const [runActive, setRunActive] = useState(false)
  const stepKey = stepIds.join("\0")

  useEffect(() => {
    const ids = stepKey.length > 0 ? stepKey.split("\0") : []
    const onReset = () => {
      setRunActive(true)
      setStatuses(resetStepStatuses(ids))
      setErrors({})
    }
    const onStep = (ev: Event) => {
      const detail = (ev as CustomEvent<ReactFlowStepStatusDetail>).detail
      setStatuses((current) => applyStepStatus(current, detail.stepId, detail.status))
      setErrors((current) => applyStepError(current, detail.stepId, detail.status, detail.message))
    }
    const onDone = (_ev: Event) => {
      void (_ev as CustomEvent<ReactFlowRunLifecycleDetail>).detail
      setRunActive(false)
    }

    reactFlowRunProgress.addEventListener("run:reset", onReset)
    reactFlowRunProgress.addEventListener("step:status", onStep)
    reactFlowRunProgress.addEventListener("run:done", onDone)
    return () => {
      reactFlowRunProgress.removeEventListener("run:reset", onReset)
      reactFlowRunProgress.removeEventListener("step:status", onStep)
      reactFlowRunProgress.removeEventListener("run:done", onDone)
    }
  }, [stepKey])

  // Fallback when lifecycle hooks lag or the modal closed before the first hook:
  // runBusy alone does not style edges — statuses must be pending/running.
  useEffect(() => {
    if (!runBusy) return
    const ids = stepKey.length > 0 ? stepKey.split("\0") : []
    setRunActive(true)
    setStatuses(resetStepStatuses(ids))
    setErrors({})
  }, [runBusy, stepKey])

  return { statuses, errors, runActive: runActive || runBusy }
}
