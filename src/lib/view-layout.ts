import type { ViewLayoutState, ViewPanel } from "../types/workspace.js"

/** Default view state: chat only, full width. */
export const DEFAULT_VIEW_STATE: ViewLayoutState = {
  chat: true,
  workflow: false,
  flow: false,
  code: false,
}

/** Count how many panels are currently active. */
export function activeViewCount(state: ViewLayoutState): number {
  return [state.chat, state.workflow, state.flow, state.code].filter(Boolean).length
}

/** Whether the workspace column (workflow, flow, or code) should render. */
export function isWorkspaceVisible(state: ViewLayoutState): boolean {
  return state.workflow || state.flow || state.code
}

/** Whether chat and workspace are shown side by side at 50% width. */
export function isPairedLayout(state: ViewLayoutState): boolean {
  return isWorkspaceVisible(state) && state.chat
}

/** Toggle a view panel; enforces at-least-one-active and workspace exclusivity. */
export function toggleViewPanel(state: ViewLayoutState, panel: ViewPanel): ViewLayoutState {
  if (state[panel]) {
    if (activeViewCount(state) <= 1) return state
    return { ...state, [panel]: false }
  }

  const next: ViewLayoutState = { ...state, [panel]: true }
  if (panel === "workflow") {
    next.code = false
    next.flow = false
  }
  if (panel === "flow") {
    next.workflow = false
    next.code = false
  }
  if (panel === "code") {
    next.workflow = false
    next.flow = false
  }
  return next
}

/** Enable workflow view after first workflow is generated (keeps chat on for paired layout). */
export function viewStateAfterFirstWorkflow(state: ViewLayoutState): ViewLayoutState {
  return { ...state, workflow: true, flow: false, code: false }
}

/** CSS width class for a column based on paired vs solo layout. */
export function columnWidthClass(paired: boolean): "is-half" | "is-full" {
  return paired ? "is-half" : "is-full"
}
