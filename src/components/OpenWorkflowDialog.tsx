import { useEffect, useId, useRef, useState } from "react"
import type { WorkflowListEntry } from "../lib/workflow-bundle.js"

/** Props for {@link OpenWorkflowDialog}. */
export interface OpenWorkflowDialogProps {
  open: boolean
  workflows: WorkflowListEntry[]
  busy?: boolean
  error?: string | null
  /** Host workflow id currently being deleted (disables that row's trash). */
  deletingId?: string | null
  onClose: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

/**
 * Modal list of host-saved workflows, with in-dialog delete confirmation.
 */
export function OpenWorkflowDialog({
  open,
  workflows,
  busy,
  error,
  deletingId,
  onClose,
  onSelect,
  onDelete,
}: OpenWorkflowDialogProps) {
  const titleId = useId()
  const firstBtn = useRef<HTMLButtonElement>(null)
  const [pendingDelete, setPendingDelete] = useState<WorkflowListEntry | null>(null)

  useEffect(() => {
    if (open) {
      setPendingDelete(null)
      firstBtn.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!pendingDelete) return
    if (!workflows.some((w) => w.id === pendingDelete.id)) {
      setPendingDelete(null)
    }
  }, [workflows, pendingDelete])

  if (!open) return null

  const confirming = pendingDelete != null
  const headerTitle = confirming ? "Delete workflow" : "Open workflow"

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-scrim/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-lg border border-outline-variant bg-surface p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={titleId} className="font-display text-title text-on-surface">
            {headerTitle}
          </h2>
          <button
            type="button"
            className="header-action-btn"
            title="Close"
            aria-label="Close"
            onClick={onClose}
            disabled={Boolean(deletingId)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {error ? <p className="mb-2 text-label text-error">{error}</p> : null}
        {confirming && pendingDelete ? (
          <>
            <p className="mb-4 text-label text-on-surface-variant">
              Delete saved workflow{" "}
              <span className="font-mono text-on-surface">{pendingDelete.label}</span> (
              <span className="font-mono text-on-surface">{pendingDelete.id}</span>) from the host?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-outline-variant px-4 py-2 font-mono text-label text-on-surface-variant hover:border-outline hover:text-on-surface"
                onClick={() => setPendingDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-error px-4 py-2 font-mono text-label text-on-error hover:brightness-110 disabled:opacity-50"
                disabled={Boolean(deletingId)}
                onClick={() => onDelete(pendingDelete.id)}
              >
                {deletingId === pendingDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </>
        ) : busy ? (
          <p className="text-label text-on-surface-variant">Loading…</p>
        ) : workflows.length === 0 ? (
          error ? null : (
            <p className="text-label text-on-surface-variant">No saved workflows on this host yet.</p>
          )
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {workflows.map((w, i) => {
              const deleting = deletingId === w.id
              return (
                <li key={w.id} className="flex items-center gap-1">
                  <button
                    ref={i === 0 ? firstBtn : undefined}
                    type="button"
                    className="flex min-w-0 flex-1 flex-col items-start rounded-md px-3 py-2 text-left hover:bg-surface-container"
                    onClick={() => onSelect(w.id)}
                    disabled={Boolean(deletingId)}
                  >
                    <span className="font-mono text-label text-on-surface">{w.label}</span>
                    <span className="font-mono text-[11px] text-on-surface-variant">
                      {w.id} · {new Date(w.updatedAt).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="header-action-btn shrink-0"
                    title={`Delete ${w.label}`}
                    aria-label={`Delete ${w.label}`}
                    disabled={Boolean(deletingId)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDelete(w)
                    }}
                  >
                    <span className="material-symbols-outlined">
                      {deleting ? "progress_activity" : "delete"}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
