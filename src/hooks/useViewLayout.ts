import { useCallback, useState } from "react"
import type { ViewLayoutState, ViewPanel } from "../types/workspace.js"
import {
  DEFAULT_VIEW_STATE,
  isPairedLayout,
  isWorkspaceVisible,
  toggleViewPanel,
  viewStateAfterFirstWorkflow,
} from "../lib/view-layout.js"

/** Manage view panel toggles and layout flags for the app shell. */
export function useViewLayout() {
  const [views, setViews] = useState<ViewLayoutState>(DEFAULT_VIEW_STATE)

  const toggleView = useCallback((panel: ViewPanel) => {
    setViews((current) => toggleViewPanel(current, panel))
  }, [])

  const onFirstWorkflow = useCallback(() => {
    setViews((current) => viewStateAfterFirstWorkflow(current))
  }, [])

  const openWorkspace = useCallback(() => {
    setViews((current) =>
      current.workflow || current.code ? current : viewStateAfterFirstWorkflow(current)
    )
  }, [])

  const ensureWorkflowVisible = useCallback(() => {
    setViews((current) =>
      current.workflow ? current : { ...current, workflow: true, code: false }
    )
  }, [])

  const workspaceVisible = isWorkspaceVisible(views)
  const paired = isPairedLayout(views)

  return {
    views,
    toggleView,
    onFirstWorkflow,
    openWorkspace,
    ensureWorkflowVisible,
    workspaceVisible,
    paired,
  }
}
