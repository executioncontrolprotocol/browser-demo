import { FluentWorkflowEditor } from "./FluentWorkflowEditor.js"
import { MonacoCodeEditor } from "./MonacoCodeEditor.js"
import { ENVIRONMENT_EDITOR_PATH } from "../lib/environment-source.js"
import type { CodeEditorTab, FormatTab } from "../types/workspace.js"

/** Props for {@link CodeSidebar}. */
export interface CodeSidebarProps {
  editorTab: CodeEditorTab
  onEditorTabChange: (tab: CodeEditorTab) => void
  formatTab: FormatTab
  onFormatTabChange: (tab: FormatTab) => void
  fluent: string
  json: string
  toon: string
  patch: string
  environmentSource: string
  compileError?: string | null
  onFluentChange?: (value: string | undefined) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const EDITOR_TABS: { id: CodeEditorTab; label: string }[] = [
  { id: "workflow", label: "Workflow" },
  { id: "environment", label: "Environment" },
]

const FORMAT_TABS: { id: FormatTab; label: string }[] = [
  { id: "fluent", label: "Fluent" },
  { id: "json", label: "JSON" },
  { id: "toon", label: "TOON" },
  { id: "patch", label: "Patch" },
]

/** Left code sidebar with Workflow / Environment Monaco tabs. */
export function CodeSidebar({
  editorTab,
  onEditorTabChange,
  formatTab,
  onFormatTabChange,
  fluent,
  json,
  toon,
  patch,
  environmentSource,
  compileError,
  onFluentChange,
  collapsed,
  onToggleCollapse,
}: CodeSidebarProps) {
  const readOnlyValue =
    formatTab === "json" ? json : formatTab === "toon" ? toon : formatTab === "patch" ? patch : ""

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-outline-variant p-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">code</span>
          <span className="font-mono text-label uppercase tracking-widest text-on-surface-variant">Logic Source</span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded p-1 transition-colors hover:bg-surface-container-high"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined text-on-surface-variant">
            {collapsed ? "last_page" : "first_page"}
          </span>
        </button>
      </div>

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

      {compileError && editorTab === "workflow" && formatTab === "fluent" ? (
        <p className="border-b border-error-container bg-error-container/20 px-4 py-2 text-label text-error">
          {compileError}
        </p>
      ) : null}

      <div className="monaco-host min-h-0 flex-1 bg-surface-container-lowest">
        {editorTab === "environment" ? (
          <MonacoCodeEditor path={ENVIRONMENT_EDITOR_PATH} value={environmentSource} readOnly />
        ) : formatTab === "fluent" ? (
          <FluentWorkflowEditor value={fluent} onChange={onFluentChange} />
        ) : (
          <pre className="h-full overflow-auto p-4 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
            {readOnlyValue}
          </pre>
        )}
      </div>
    </div>
  )
}
