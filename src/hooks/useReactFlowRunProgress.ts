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

/** Subscribe to format-reactflow run progress for the Workflow canvas. */
export function useReactFlowRunProgress(stepIds: string[]) {
  const [statuses, setStatuses] = useState<StepStatusMap>({})
  const [runActive, setRunActive] = useState(false)
  const stepKey = stepIds.join("\0")

  useEffect(() => {
    const ids = stepKey.length > 0 ? stepKey.split("\0") : []
    const onReset = () => {
      setRunActive(true)
      setStatuses(resetStepStatuses(ids))
    }
    const onStep = (ev: Event) => {
      const detail = (ev as CustomEvent<ReactFlowStepStatusDetail>).detail
      setStatuses((current) => applyStepStatus(current, detail.stepId, detail.status))
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

  return { statuses, runActive }
}
