import { MonacoCodeEditor } from "./MonacoCodeEditor.js"
import { FLUENT_EDITOR_PATH } from "../lib/fluent-monaco-config.js"

/** Props for {@link FluentWorkflowEditor}. */
export interface FluentWorkflowEditorProps {
  /** Fluent workflow TypeScript source. */
  value: string
  /** Called when the user edits source (debounced compile happens in the parent). */
  onChange?: (value: string | undefined) => void
}

/** Monaco editor for browser Fluent workflow source only (isolated virtual model URI). */
export function FluentWorkflowEditor({ value, onChange }: FluentWorkflowEditorProps) {
  return <MonacoCodeEditor path={FLUENT_EDITOR_PATH} value={value} onChange={onChange} />
}
