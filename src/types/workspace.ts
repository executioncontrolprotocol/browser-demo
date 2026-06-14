/** Bottom-docked chat panel height mode. */
export type ChatPanelState = "expanded" | "compact" | "collapsed"

/** Left sidebar code editor tab. */
export type CodeEditorTab = "workflow" | "environment"

/** Workflow format tab (secondary, workflow editor only). */
export type FormatTab = "fluent" | "json" | "toon" | "patch"

/** Top app bar navigation. */
export type AppNavTab = "editor" | "validation" | "run"

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
