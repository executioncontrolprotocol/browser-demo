import MonacoEditor, { type EditorProps } from "@monaco-editor/react"
import type { ComponentType } from "react"
import { configureFluentMonaco, SOLARIS_SLATE_THEME } from "../lib/fluent-monaco-config.js"

/** React 19-compatible Monaco wrapper (upstream default export typing is incompatible). */
const Editor = MonacoEditor as ComponentType<EditorProps>

/** Props for {@link MonacoCodeEditor}. */
export interface MonacoCodeEditorProps {
  /** Editor document URI (virtual path). */
  path: string
  /** Source text. */
  value: string
  /** Language mode. */
  language?: string
  /** Called when the user edits source. */
  onChange?: (value: string | undefined) => void
  /** When true, editor is read-only. */
  readOnly?: boolean
}

/** Shared Monaco editor with Solaris Slate theme. */
export function MonacoCodeEditor({
  path,
  value,
  language = "typescript",
  onChange,
  readOnly = false,
}: MonacoCodeEditorProps) {
  return (
    <Editor
      height="100%"
      theme={SOLARIS_SLATE_THEME}
      defaultLanguage={language}
      language={language}
      path={path}
      value={value}
      beforeMount={configureFluentMonaco}
      onMount={(editor, monaco) => {
        configureFluentMonaco(monaco)
        const model = editor.getModel()
        if (model) {
          monaco.editor.setModelMarkers(model, "ecp", [])
        }
      }}
      onChange={onChange}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        renderValidationDecorations: "off",
        quickSuggestions: false,
        parameterHints: { enabled: false },
        suggestOnTriggerCharacters: false,
        wordBasedSuggestions: "off",
        scrollBeyondLastLine: false,
        padding: { top: 8 },
      }}
    />
  )
}
