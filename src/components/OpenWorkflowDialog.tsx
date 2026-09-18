import { useEffect, useId, useRef } from "react"
import type { WorkflowListEntry } from "../lib/workflow-bundle.js"

/** Props for {@link OpenWorkflowDialog}. */
export interface OpenWorkflowDialogProps {
  open: boolean
  workflows: WorkflowListEntry[]
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSelect: (id: string) => void
}

/**
 * Modal list of host-saved workflows.
 */
export function OpenWorkflowDialog({
  open,
  workflows,
  busy,
  error,
  onClose,
  onSelect,
}: OpenWorkflowDialogProps) {
  const titleId = useId()
  const firstBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) firstBtn.current?.focus()
  }, [open])

  if (!open) return null

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
            Open workflow
          </h2>
          <button
            type="button"
            className="header-action-btn"
            title="Close"
            aria-label="Close"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {error ? <p className="mb-2 text-label text-error">{error}</p> : null}
        {busy ? (
          <p className="text-label text-on-surface-variant">Loading…</p>
        ) : workflows.length === 0 ? (
          error ? null : (
            <p className="text-label text-on-surface-variant">No saved workflows on this host yet.</p>
          )
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {workflows.map((w, i) => (
              <li key={w.id}>
                <button
                  ref={i === 0 ? firstBtn : undefined}
                  type="button"
                  className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-surface-container"
                  onClick={() => onSelect(w.id)}
                >
                  <span className="font-mono text-label text-on-surface">{w.label}</span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    {w.id} · {new Date(w.updatedAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
