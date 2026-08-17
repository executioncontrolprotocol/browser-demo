import { useEffect, useState } from "react"
import type { ReactFlowIoData, ReactFlowIoKind } from "@executioncontrolprotocol/format-reactflow"
import {
  WORKFLOW_IO_NAME_RE,
  type WorkflowIoField,
  type WorkflowIoSchemaType,
} from "../lib/workflow-io.js"

const TYPE_OPTIONS: WorkflowIoSchemaType[] = ["string", "number", "boolean", "object", "array"]

/** Save payload for projected Inputs / Outputs configure. */
export interface IoConfigureSavePayload {
  kind: ReactFlowIoKind
  fields: WorkflowIoField[]
  renames: Array<{ from: string; to: string }>
}

/** Props for {@link IoConfigureDialog}. */
export interface IoConfigureDialogProps {
  kind: ReactFlowIoKind
  data: ReactFlowIoData
  fields: WorkflowIoField[]
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSave: (payload: IoConfigureSavePayload) => void | Promise<void>
}

/** Configure `workflow.accepts` / `workflow.returns` properties (not a step). */
export function IoConfigureDialog({
  kind,
  data,
  fields: initialFields,
  busy = false,
  error = null,
  onClose,
  onSave,
}: IoConfigureDialogProps) {
  const [rows, setRows] = useState<WorkflowIoField[]>(() => initialFields)
  const [originalNames, setOriginalNames] = useState<string[]>(() => initialFields.map((f) => f.name))
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<WorkflowIoSchemaType>("string")
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    setRows(initialFields)
    setOriginalNames(initialFields.map((f) => f.name))
    setNewName("")
    setNewType("string")
    setNameError(null)
  }, [kind, initialFields])

  const addField = () => {
    const name = newName.trim()
    if (!WORKFLOW_IO_NAME_RE.test(name)) {
      setNameError("Use a simple identifier (letters, numbers, underscore)")
      return
    }
    if (rows.some((row) => row.name === name)) {
      setNameError("That name is already used")
      return
    }
    setNameError(null)
    const field: WorkflowIoField = {
      name,
      type: newType,
      required: true,
      valueSchema: { type: newType },
    }
    setRows((prev) => [...prev, field])
    setOriginalNames((prev) => [...prev, ""])
    setNewName("")
  }

  const handleSave = () => {
    const seen = new Set<string>()
    for (const row of rows) {
      if (!WORKFLOW_IO_NAME_RE.test(row.name)) {
        setNameError("Every parameter needs a simple identifier")
        return
      }
      if (seen.has(row.name)) {
        setNameError(`Duplicate name: ${row.name}`)
        return
      }
      seen.add(row.name)
    }
    setNameError(null)
    const renames: Array<{ from: string; to: string }> = []
    rows.forEach((row, index) => {
      const from = originalNames[index]
      if (from && from !== row.name) renames.push({ from, to: row.name })
    })
    void onSave({ kind, fields: rows, renames })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="io-configure-title"
    >
      <div className="flex h-full w-[75vw] max-w-[75vw] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0">
            <h2 id="io-configure-title" className="font-display text-headline text-on-surface">
              Configure {data.label}
            </h2>
            <p className="mt-1 font-mono text-label text-on-surface-variant">
              {kind === "accepts" ? "workflow.accepts" : "workflow.returns"}
            </p>
          </div>
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {rows.length === 0 ? (
            <p className="text-body text-on-surface-variant">
              No parameters yet. Add one below
              {kind === "accepts" ? " to accept run input." : " to expose run output."}
            </p>
          ) : (
            rows.map((row, index) => (
              <div
                key={`${originalNames[index] || row.name}-${index}`}
                className="grid grid-cols-[1fr_8rem_auto_auto] items-end gap-3"
              >
                <label className="block space-y-1">
                  <span className="font-mono text-label text-on-surface">Name</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
                    value={row.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, name } : r)))
                    }}
                    disabled={busy}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-mono text-label text-on-surface">Type</span>
                  <select
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
                    value={row.type}
                    onChange={(e) => {
                      const type = e.target.value as WorkflowIoSchemaType
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, type, valueSchema: { type } } : r
                        )
                      )
                    }}
                    disabled={busy}
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 pb-2 font-mono text-sm text-on-surface">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={row.required}
                    onChange={(e) => {
                      const required = e.target.checked
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, required } : r)))
                    }}
                    disabled={busy}
                  />
                  required
                </label>
                <button
                  type="button"
                  className="mb-2 font-mono text-[11px] text-on-surface-variant hover:text-error"
                  onClick={() => {
                    setRows((prev) => prev.filter((_, i) => i !== index))
                    setOriginalNames((prev) => prev.filter((_, i) => i !== index))
                  }}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            ))
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-outline-variant/50 pt-4">
            <label className="block min-w-[12rem] flex-1 space-y-1">
              <span className="font-mono text-label text-on-surface">Add parameter</span>
              <input
                type="text"
                className="w-full rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="name"
                disabled={busy}
              />
            </label>
            <select
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
              value={newType}
              onChange={(e) => setNewType(e.target.value as WorkflowIoSchemaType)}
              disabled={busy}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-outline-variant px-3 py-2 font-mono text-label text-on-surface-variant hover:border-outline hover:text-on-surface"
              onClick={addField}
              disabled={busy}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                add
              </span>
              Add
            </button>
          </div>
          {nameError ? <p className="text-body text-error">{nameError}</p> : null}
          {error ? <p className="text-body text-error">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-outline-variant px-4 py-2 font-mono text-label text-on-surface-variant hover:border-outline hover:text-on-surface"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 font-mono text-label text-on-primary disabled:opacity-50"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
