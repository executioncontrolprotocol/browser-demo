import { useEffect, useId, useRef, useState } from "react"
import { sanitizeWorkflowFilename } from "../lib/workflow-bundle.js"

/** Values submitted from {@link SaveWorkflowDialog}. */
export interface SaveWorkflowFormValues {
  id: string
  label: string
}

/** Props for {@link SaveWorkflowDialog}. */
export interface SaveWorkflowDialogProps {
  open: boolean
  /** Suggested id stem (sanitized on submit). */
  defaultId: string
  /** Suggested display label. */
  defaultLabel: string
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSave: (values: SaveWorkflowFormValues) => void
}

/**
 * First-save dialog for host workflow id and label.
 */
export function SaveWorkflowDialog({
  open,
  defaultId,
  defaultLabel,
  busy,
  error,
  onClose,
  onSave,
}: SaveWorkflowDialogProps) {
  const titleId = useId()
  const idInput = useRef<HTMLInputElement>(null)
  const [id, setId] = useState(defaultId)
  const [label, setLabel] = useState(defaultLabel)

  useEffect(() => {
    if (open) {
      setId(defaultId)
      setLabel(defaultLabel)
      idInput.current?.focus()
      idInput.current?.select()
    }
  }, [open, defaultId, defaultLabel])

  if (!open) return null

  const canSubmit = Boolean(id.trim()) && !busy

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
            Save workflow
          </h2>
          <button
            type="button"
            className="header-action-btn"
            title="Close"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="mb-3 text-label text-on-surface-variant">
          Save Fluent source to the paired host under{" "}
          <span className="font-mono">~/.ecp/workflows/</span>.
        </p>
        {error ? <p className="mb-2 text-label text-error">{error}</p> : null}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            const sanitized = sanitizeWorkflowFilename(id)
            onSave({
              id: sanitized,
              label: label.trim() || sanitized,
            })
          }}
        >
          <label className="block space-y-1">
            <span className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
              Id
            </span>
            <input
              ref={idInput}
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-label text-on-surface outline-none focus:border-outline"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
              Label
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-label text-on-surface outline-none focus:border-outline"
              autoComplete="off"
            />
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-4 py-2 font-mono text-label text-on-surface-variant hover:border-outline hover:text-on-surface"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 font-mono text-label text-on-primary hover:brightness-110 disabled:opacity-50"
              disabled={!canSubmit}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
