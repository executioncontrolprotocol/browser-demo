import { FluentWorkflowEditor } from "./FluentWorkflowEditor.js"
import { MermaidDiagramViewer } from "./MermaidDiagramViewer.js"
import { MonacoCodeEditor } from "./MonacoCodeEditor.js"
import { PanelHeader } from "./PanelHeader.js"
import { ENVIRONMENT_EDITOR_PATH } from "../lib/environment-source.js"
import type { CodeEditorTab, FormatTab } from "../types/workspace.js"

/** Props for {@link CodePanel}. */
export interface CodePanelProps {
  editorTab: CodeEditorTab
  onEditorTabChange: (tab: CodeEditorTab) => void
  formatTab: FormatTab
  onFormatTabChange: (tab: FormatTab) => void
  fluent: string
  /** Bumped when assistant replaces Fluent source so Monaco remounts with new defaultValue. */
  fluentEditorKey: number
  json: string
  toon: string
  mermaid: string
  environmentSource: string
  compileError?: string | null
  onFluentChange?: (value: string | undefined) => void
}

const EDITOR_TABS: { id: CodeEditorTab; label: string }[] = [
  { id: "workflow", label: "Workflow" },
  { id: "environment", label: "Environment" },
]

const FORMAT_TABS: { id: FormatTab; label: string }[] = [
  { id: "fluent", label: "Fluent" },
  { id: "json", label: "JSON" },
  { id: "toon", label: "TOON" },
  { id: "mermaid", label: "Mermaid" },
]

/** Full-height code workspace view with Workflow / Environment Monaco tabs. */
export function CodePanel({
  editorTab,
  onEditorTabChange,
  formatTab,
  onFormatTabChange,
  fluent,
  fluentEditorKey,
  json,
  toon,
  mermaid,
  environmentSource,
  compileError,
  onFluentChange,
}: CodePanelProps) {
  const readOnlyValue =
    formatTab === "json" ? json : formatTab === "toon" ? toon : formatTab === "mermaid" ? mermaid : ""

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-container-lowest"
      id="code-drawer"
    >
      <PanelHeader icon="code" label="Logic Source" />

      <nav className="flex border-b border-outline-variant px-2">
        {EDITOR_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onEditorTabChange(id)}
            className={`px-4 py-2 font-mono text-label uppercase tracking-widest transition-colors ${
              editorTab === id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {editorTab === "workflow" ? (
        <div className="flex items-center gap-1 border-b border-outline-variant/60 px-2 py-1">
          <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-outline">Format</span>
          {FORMAT_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onFormatTabChange(id)}
              className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${
                formatTab === id
                  ? "border border-primary/30 bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="border-b border-outline-variant/60 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-outline">
          View only
        </p>
      )}

      {compileError && editorTab === "workflow" ? (
        <p className="border-b border-error-container bg-error-container/20 px-4 py-2 text-label text-error">
          {compileError}
        </p>
      ) : null}

      <div className="monaco-host relative min-h-0 flex-1 bg-surface-container-lowest">
        <div className={editorTab === "environment" ? "h-full" : "hidden h-full"}>
          <MonacoCodeEditor path={ENVIRONMENT_EDITOR_PATH} value={environmentSource} readOnly />
        </div>
        <div className={editorTab === "workflow" ? "relative h-full" : "hidden relative h-full"}>
          <FluentWorkflowEditor
            key={fluentEditorKey}
            defaultValue={fluent}
            onChange={onFluentChange}
            visible={formatTab === "fluent"}
          />
          {formatTab === "json" || formatTab === "toon" ? (
            <pre className="absolute inset-0 overflow-auto whitespace-pre-wrap bg-surface-container-lowest p-4 font-mono text-label text-on-surface-variant">
              {readOnlyValue}
            </pre>
          ) : null}
          {formatTab === "mermaid" ? (
            <div className="absolute inset-0 flex min-h-0 flex-col bg-surface-container-lowest">
              <div className="flex min-h-0 flex-1 flex-col border-b border-outline-variant/60">
                <MermaidDiagramViewer source={mermaid} />
              </div>
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-label text-on-surface-variant">
                {mermaid}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
