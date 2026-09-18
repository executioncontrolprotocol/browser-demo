import type { ViewLayoutState, ViewPanel } from "../types/workspace.js"

/** Props for {@link TopAppBar}. */
export interface TopAppBarProps {
  views: ViewLayoutState
  onToggleView: (panel: ViewPanel) => void
  onExecute: () => void
  executeDisabled?: boolean
  executeBusy?: boolean
  onSettings: () => void
  /** Host paired for remote invoke (enables Save / Open). */
  hostPaired?: boolean
  /** Whether a workflow is loaded in the editor. */
  hasWorkflow?: boolean
  onSave?: () => void
  onDownload?: () => void
  onOpen?: () => void
  saveBusy?: boolean
}

/** Top application bar with centered view navigation and action buttons. */
export function TopAppBar({
  views,
  onToggleView,
  onExecute,
  executeDisabled,
  executeBusy,
  onSettings,
  hostPaired = false,
  hasWorkflow = false,
  onSave,
  onDownload,
  onOpen,
  saveBusy,
}: TopAppBarProps) {
  const canSave = Boolean(hostPaired && hasWorkflow && onSave && !saveBusy)
  const canDownload = Boolean(hasWorkflow && onDownload)
  const canOpen = Boolean(hostPaired && onOpen)

  return (
    <header
      className="relative z-50 flex h-16 w-full shrink-0 items-center border-b border-outline-variant bg-surface px-gutter"
      id="app-header"
    >
      <div className="flex shrink-0 items-center">
        <span className="font-display text-headline font-bold text-on-surface">ECP Editor</span>
      </div>

      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center" id="view-nav">
        <div className="view-nav-group" id="view-nav-group">
          <button
            type="button"
            className={`view-nav-btn${views.chat ? " active-btn" : ""}`}
            id="btn-view-chat"
            title="Chat"
            onClick={() => onToggleView("chat")}
          >
            <span className="material-symbols-outlined">forum</span>
          </button>
          <div className="view-nav-workspace-group" id="view-nav-workspace-group">
            <button
              type="button"
              className={`view-nav-btn${views.workflow ? " active-btn" : ""}`}
              id="btn-view-workflow"
              title="Workflow"
              onClick={() => onToggleView("workflow")}
            >
              <span className="material-symbols-outlined">account_tree</span>
            </button>
            <button
              type="button"
              className={`view-nav-btn${views.code ? " active-btn" : ""}`}
              id="btn-view-code"
              title="Code"
              onClick={() => onToggleView("code")}
            >
              <span className="material-symbols-outlined">code</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {canOpen ? (
          <button
            type="button"
            className="header-action-btn"
            title="Open saved workflow"
            aria-label="Open saved workflow"
            onClick={onOpen}
          >
            <span className="material-symbols-outlined">folder_open</span>
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canSave}
          className="header-action-btn"
          title={
            !hasWorkflow
              ? "Load or author a workflow to save"
              : !hostPaired
                ? "Pair with ecp up to save to the host"
                : saveBusy
                  ? "Saving…"
                  : "Save workflow to host"
          }
          aria-label="Save workflow"
          onClick={onSave}
        >
          <span className="material-symbols-outlined">save</span>
        </button>
        <button
          type="button"
          disabled={!canDownload}
          className="header-action-btn"
          title={
            hasWorkflow ? "Download workflow file" : "Load or author a workflow to download"
          }
          aria-label="Download workflow"
          onClick={onDownload}
        >
          <span className="material-symbols-outlined">download</span>
        </button>
        <button
          type="button"
          disabled={executeDisabled || executeBusy}
          className="header-action-btn header-action-btn--primary"
          title={executeBusy ? "Running..." : "Execute"}
          onClick={onExecute}
        >
          <span className="material-symbols-outlined">play_arrow</span>
        </button>
        <div className="mx-1 h-6 w-px bg-outline-variant" />
        <button
          type="button"
          className="header-action-btn"
          title="Settings"
          aria-label="Settings"
          onClick={onSettings}
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-outline-variant"
          aria-hidden
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
            account_circle
          </span>
        </div>
      </div>
    </header>
  )
}
