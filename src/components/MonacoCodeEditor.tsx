import { useEffect, useRef } from "react"
import MonacoEditor, { type EditorProps, type Monaco } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import type { ComponentType } from "react"
import { configureFluentMonaco, SOLARIS_SLATE_THEME } from "../lib/fluent-monaco-config.js"
import { logFluentEditorChange } from "../lib/fluent-edit-debug.js"

/** React 19-compatible Monaco wrapper (upstream default export typing is incompatible). */
const Editor = MonacoEditor as ComponentType<EditorProps>

/** Props for {@link MonacoCodeEditor}. */
export interface MonacoCodeEditorProps {
  /** Editor document URI (virtual path). */
  path: string
  /** Controlled source text (read-only / environment views). */
  value?: string
  /** Initial source for uncontrolled editing (Fluent workflow). */
  defaultValue?: string
  /** Language mode. */
  language?: string
  /** Called when the user edits source. */
  onChange?: (value: string | undefined) => void
  /** When true, editor is read-only. */
  readOnly?: boolean
  /** When false, editor is hidden but may stay mounted; triggers layout when shown again. */
  visible?: boolean
}

/** Shared Monaco editor with Solaris Slate theme. */
export function MonacoCodeEditor({
  path,
  value,
  defaultValue,
  language = "typescript",
  onChange,
  readOnly = false,
  visible = true,
}: MonacoCodeEditorProps) {
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!visible) return
    requestAnimationFrame(() => editorRef.current?.layout())
  }, [visible])

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      editorRef.current = null
    }
  }, [])

  const editorValueProps =
    defaultValue !== undefined ? { defaultValue } : { value: value ?? "" }

  return (
    <div className={visible ? "h-full min-h-0 w-full" : "hidden h-full min-h-0 w-full"}>
      <Editor
        height="100%"
        theme={SOLARIS_SLATE_THEME}
        defaultLanguage={language}
        language={language}
        path={path}
        saveViewState={false}
        {...editorValueProps}
        beforeMount={configureFluentMonaco}
        onMount={(editorInstance, monaco: Monaco) => {
          editorRef.current = editorInstance
          configureFluentMonaco(monaco)
          const model = editorInstance.getModel()
          if (model) {
            monaco.editor.setModelMarkers(model, "ecp", [])
          }

          if (!readOnly) {
            editorInstance.onDidChangeModelContent(() => {
              const text = editorInstance.getValue()
              const lineCount = editorInstance.getModel()?.getLineCount() ?? 0
              logFluentEditorChange(path, text.length, lineCount)
              onChangeRef.current?.(text)
            })
          }

          resizeObserverRef.current?.disconnect()
          const container = editorInstance.getDomNode()?.parentElement
          if (!container) {
            editorInstance.layout()
            return
          }

          let frame = 0
          const layout = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => editorInstance.layout())
          }
          layout()
          const observer = new ResizeObserver(layout)
          observer.observe(container)
          resizeObserverRef.current = observer
        }}
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
          automaticLayout: false,
        }}
      />
    </div>
  )
}
