/** Toggleable main view panel (chat, Mermaid workflow, React Flow, or code editor). */
export type ViewPanel = "chat" | "workflow" | "flow" | "code"

/** Boolean flags for which view panels are active. */
export interface ViewLayoutState {
  /** Chat assistant column. */
  chat: boolean
  /** Mermaid workflow graph column. */
  workflow: boolean
  /** React Flow graph column. */
  flow: boolean
  /** Code editor column (mutually exclusive with workflow and flow). */
  code: boolean
}

/** Left sidebar code editor tab. */
export type CodeEditorTab = "workflow" | "environment"

/** Workflow format tab (secondary, workflow editor only). */
export type FormatTab = "fluent" | "json" | "toon" | "mermaid"

/** @deprecated Use {@link CodeEditorTab} or {@link FormatTab}. */
export type CodeTab = FormatTab

/** @deprecated Retired with split layout. */
export type WorkflowTab = "graph" | "validation" | "run"

/** @deprecated Retired with split layout. */
export type EnvironmentTab = "overview" | "extensions" | "capabilities"

/** Chat message in history. */
export interface ChatMessage {
  id: string
  role: "user" | "agent"
  text: string
  /** When set, message is styled as an error. */
  variant?: "normal" | "error"
}
