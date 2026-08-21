import { useEffect, useMemo, useState } from "react"
import type { ReactFlowPort, ReactFlowStepData } from "@executioncontrolprotocol/format-reactflow"
import { ConfigPortControl } from "./ConfigFieldControl.js"
import {
  defaultDraftForKind,
  editorKindForPort,
  optionsForPort,
  parseEditedLiteral,
  draftForPort,
  literalPorts,
  refPorts,
  unboundPorts,
  type StepConfigureSavePayload,
} from "../lib/step-configure.js"
import { encodeFileForConfigure } from "../lib/run-form-files.js"

/** Props for {@link StepConfigureDialog}. */
export interface StepConfigureDialogProps {
  stepId: string
  step: ReactFlowStepData
  /** Original `step.input` values for type coercion on save. */
  originalInput: Record<string, unknown> | undefined
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSave: (payload: StepConfigureSavePayload) => void | Promise<void>
}

/** Full-screen dialog to edit literal step inputs, `as` key, and add unbound schema params. */
export function StepConfigureDialog({
  stepId,
  step,
  originalInput,
  busy = false,
  error = null,
  onClose,
  onSave,
}: StepConfigureDialogProps) {
  const initialLiterals = useMemo(() => literalPorts(step), [step])
  const refs = useMemo(() => refPorts(step), [step])
  const available = useMemo(() => unboundPorts(step), [step])

  const [activePorts, setActivePorts] = useState<ReactFlowPort[]>(() => initialLiterals)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const port of initialLiterals) {
      next[port.name] = draftForPort(port, originalInput?.[port.name])
    }
    return next
  })
  const [asKey, setAsKey] = useState(step.as ?? "")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [asError, setAsError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    const nextLiterals = literalPorts(step)
    setActivePorts(nextLiterals)
    const next: Record<string, string> = {}
    for (const port of nextLiterals) {
      next[port.name] = draftForPort(port, originalInput?.[port.name])
    }
    setDrafts(next)
    setAsKey(step.as ?? "")
    setFieldErrors({})
    setAsError(null)
    setPickerOpen(false)
  }, [step, stepId, originalInput])

  const activeNames = useMemo(() => new Set(activePorts.map((p) => p.name)), [activePorts])
  const addable = useMemo(
    () => available.filter((p) => !activeNames.has(p.name)),
    [available, activeNames]
  )

  const addPort = (port: ReactFlowPort) => {
    const kind = editorKindForPort(port)
    const options = optionsForPort(port)
    setActivePorts((prev) => [...prev, port])
    setDrafts((prev) => ({ ...prev, [port.name]: defaultDraftForKind(kind, options) }))
    setPickerOpen(false)
  }

  const removePort = (name: string) => {
    setActivePorts((prev) => prev.filter((p) => p.name !== name))
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSave = () => {
    const literals: Record<string, unknown> = {}
    const errors: Record<string, string> = {}
    for (const port of activePorts) {
      const text = drafts[port.name] ?? ""
      const original = originalInput?.[port.name]
      const parsed = parseEditedLiteral(text, original, port.typeLabel, port.valueSchema, port.name)
      if (!parsed.ok) {
        errors[port.name] = parsed.error
        continue
      }
      literals[port.name] = parsed.value
    }

    const trimmedAs = asKey.trim()
    if (trimmedAs && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmedAs)) {
      setAsError("Use a simple identifier (letters, numbers, underscore)")
      setFieldErrors(errors)
      return
    }
    setAsError(null)

    const initialNames = new Set(initialLiterals.map((p) => p.name))
    const activeNameSet = new Set(activePorts.map((p) => p.name))
    const removedKeys = [...initialNames].filter((name) => !activeNameSet.has(name))

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    void onSave({ literals, removedKeys, asKey: trimmedAs })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-configure-title"
    >
      <div className="flex h-full w-[75vw] max-w-[75vw] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0">
            <h2 id="step-configure-title" className="font-display text-headline text-on-surface">
              Configure step
            </h2>
            <p className="mt-1 truncate font-mono text-label text-on-surface-variant">{step.label}</p>
            {step.uses ? (
              <p className="mt-0.5 break-all font-mono text-[11px] text-outline">{step.uses}</p>
            ) : null}
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <label className="block space-y-1.5">
            <span className="font-mono text-label text-on-surface">
              Store key <span className="text-outline">(as)</span>
            </span>
            <input
              type="text"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-outline"
              value={asKey}
              onChange={(e) => setAsKey(e.target.value)}
              placeholder="e.g. email"
              disabled={busy}
            />
            <span className="block text-[11px] text-on-surface-variant">
              Commit output into workflow state under this key. Downstream refs use it (e.g.{" "}
              <span className="font-mono">ref(&quot;{(asKey.trim() || "email") + ".text"}&quot;)</span>
              ).
            </span>
            {asError ? <span className="block text-label text-error">{asError}</span> : null}
          </label>

          {activePorts.length === 0 ? (
            <p className="text-body text-on-surface-variant">
              No literal inputs yet. Add a parameter from the capability schema below.
            </p>
          ) : (
            activePorts.map((port) => {
              const fieldError = fieldErrors[port.name]
              return (
                <div key={port.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-label text-on-surface">
                      {port.name}
                      <span className="text-outline">:{port.typeLabel}</span>
                    </span>
                    <button
                      type="button"
                      className="font-mono text-[11px] text-on-surface-variant hover:text-error"
                      onClick={() => removePort(port.name)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                  <ConfigPortControl
                    fieldId={stepId}
                    port={port}
                    value={drafts[port.name] ?? ""}
                    busy={busy}
                    onChange={(next) => setDrafts((prev) => ({ ...prev, [port.name]: next }))}
                    onFile={
                      editorKindForPort(port) === "file"
                        ? (file) => {
                            void encodeFileForConfigure(file, port).then((encoded) => {
                              setDrafts((prev) => ({ ...prev, [port.name]: encoded.draft }))
                              setFieldErrors((prev) => {
                                const next = { ...prev }
                                delete next[port.name]
                                return next
                              })
                            })
                          }
                        : undefined
                    }
                  />
                  {fieldError ? <span className="block text-label text-error">{fieldError}</span> : null}
                </div>
              )
            })
          )}

          <div className="relative border-t border-outline-variant/50 pt-4">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-outline-variant px-3 py-2 font-mono text-label text-on-surface-variant hover:border-outline hover:text-on-surface disabled:opacity-40"
              onClick={() => setPickerOpen((open) => !open)}
              disabled={busy || addable.length === 0}
              title={addable.length === 0 ? "No unbound schema inputs left" : "Add parameter"}
            >
              <span className="material-symbols-outlined text-base" aria-hidden>
                add
              </span>
              Add parameter
            </button>

            {pickerOpen && addable.length > 0 ? (
              <ul className="absolute left-0 z-10 mt-2 max-h-56 min-w-[16rem] overflow-auto rounded-lg border border-outline-variant bg-surface-container-high py-1 shadow-lg">
                {addable.map((port) => (
                  <li key={port.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-[12px] text-on-surface hover:bg-surface-container"
                      onClick={() => addPort(port)}
                      disabled={busy}
                    >
                      <span>
                        {port.name}
                        <span className="text-outline">:{port.typeLabel}</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-on-surface-variant">
                        {editorKindForPort(port)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {refs.length > 0 ? (
            <div className="space-y-2 border-t border-outline-variant/50 pt-4">
              <p className="font-mono text-label uppercase tracking-wide text-on-surface-variant">
                Connected inputs
              </p>
              <ul className="space-y-1">
                {refs.map((port) => (
                  <li key={port.id} className="font-mono text-[12px] text-on-surface-variant">
                    {port.name}
                    <span className="text-outline">:{port.typeLabel}</span>
                    <span className="text-tertiary-fixed-dim"> ← {port.refPath}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
