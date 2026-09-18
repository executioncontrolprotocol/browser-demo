import { useEffect, useId, useRef, useState } from "react"
import type { WorkflowDownloadFormat } from "../lib/workflow-bundle.js"

/** Props for {@link DownloadWorkflowDialog}. */
export interface DownloadWorkflowDialogProps {
  open: boolean
  onClose: () => void
  onDownload: (format: WorkflowDownloadFormat) => void
}

/**
 * Choose JSON (manifest) or TypeScript (Fluent) for browser download.
 * Defaults to TypeScript.
 */
export function DownloadWorkflowDialog({
  open,
  onClose,
  onDownload,
}: DownloadWorkflowDialogProps) {
  const titleId = useId()
  const firstInput = useRef<HTMLInputElement>(null)
  const [format, setFormat] = useState<WorkflowDownloadFormat>("fluent")

  useEffect(() => {
    if (open) {
      setFormat("fluent")
      firstInput.current?.focus()
    }
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
            Download workflow
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
        <p className="mb-3 text-label text-on-surface-variant">
          Choose a single format. TypeScript is Fluent source; JSON is the workflow manifest.
        </p>
        <fieldset className="mb-4 space-y-2">
          <legend className="sr-only">Download format</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-surface-container">
            <input
              ref={firstInput}
              type="radio"
              name="download-format"
              className="mt-1"
              checked={format === "fluent"}
              onChange={() => setFormat("fluent")}
            />
            <span>
              <span className="block font-mono text-label text-on-surface">TypeScript (Fluent)</span>
              <span className="block text-[11px] text-on-surface-variant">.workflow.ts</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-surface-container">
            <input
              type="radio"
              name="download-format"
              className="mt-1"
              checked={format === "manifest"}
              onChange={() => setFormat("manifest")}
            />
            <span>
              <span className="block font-mono text-label text-on-surface">JSON (manifest)</span>
              <span className="block text-[11px] text-on-surface-variant">.workflow.json</span>
            </span>
          </label>
        </fieldset>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-outline-variant px-4 py-2 font-mono text-label text-on-surface-variant hover:border-outline hover:text-on-surface"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 font-mono text-label text-on-primary hover:brightness-110"
            onClick={() => {
              onDownload(format)
              onClose()
            }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  )
}
