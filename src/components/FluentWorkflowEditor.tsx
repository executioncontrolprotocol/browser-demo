import { MonacoCodeEditor } from "./MonacoCodeEditor.js"
import { FLUENT_EDITOR_PATH } from "../lib/fluent-monaco-config.js"

/** Props for {@link FluentWorkflowEditor}. */
export interface FluentWorkflowEditorProps {
  /** Initial Fluent workflow TypeScript source (uncontrolled; remount via parent `key`). */
  defaultValue: string
  /** Called when the user edits source (debounced compile happens in the parent). */
  onChange?: (value: string | undefined) => void
  /** When false, editor stays mounted but hidden (e.g. another format tab is active). */
  visible?: boolean
}

/** Monaco editor for browser Fluent workflow source only (isolated virtual model URI). */
export function FluentWorkflowEditor({ defaultValue, onChange, visible = true }: FluentWorkflowEditorProps) {
  return (
    <MonacoCodeEditor
      path={FLUENT_EDITOR_PATH}
      defaultValue={defaultValue}
      onChange={onChange}
      visible={visible}
    />
  )
}
