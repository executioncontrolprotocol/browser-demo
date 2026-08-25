import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import {
  createCapabilityBlobStore,
  type CapabilityBlob,
  type CapabilityBlobStore,
} from "@executioncontrolprotocol/core"
import { ConfigPortControl } from "./ConfigFieldControl.js"
import { draftForPort, editorKindForPort, parseEditedLiteral } from "../lib/step-configure.js"
import { runFormPortsFromAccepts } from "../lib/workflow-io.js"
import { encodeFileForPort, locatorFromFileDraft } from "../lib/run-form-files.js"

/** Props for {@link RunInputForm}. */
export interface RunInputFormProps {
  runBusy: boolean
  onRun: (input?: Record<string, unknown>, blobs?: CapabilityBlobStore) => void
  hasWorkflow: boolean
  acceptsSchema?: Record<string, unknown>
  /** File picker requires a paired host for locator resolution / hops. */
  filePickerEnabled?: boolean
}

/** Collects `accepts` input and runs the workflow. @category Demo */
export function RunInputForm({
  runBusy,
  onRun,
  hasWorkflow,
  acceptsSchema,
  filePickerEnabled = false,
}: RunInputFormProps) {
  const ports = useMemo(() => runFormPortsFromAccepts(acceptsSchema), [acceptsSchema])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const filesByLocator = useRef(new Map<string, CapabilityBlob>())

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const port of ports) {
      next[port.name] = draftForPort(port, undefined)
    }
    setDrafts(next)
    setFieldErrors({})
    filesByLocator.current.clear()
  }, [ports])

  const applyFile = async (port: ReactFlowPort, file: File) => {
    try {
      const encoded = await encodeFileForPort(file, port)
      filesByLocator.current.set(encoded.locator, encoded.blob)
      setDrafts((prev) => ({ ...prev, [port.name]: encoded.draft }))
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[port.name]
        return next
      })
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        [port.name]: err instanceof Error ? err.message : String(err),
      }))
    }
  }

  const handleRun = () => {
    if (ports.length === 0) {
      onRun()
      return
    }
    const input: Record<string, unknown> = {}
    const errors: Record<string, string> = {}
    const blobs = createCapabilityBlobStore()
    for (const port of ports) {
      const draft = drafts[port.name] ?? ""
      const parsed = parseEditedLiteral(
        draft,
        undefined,
        port.typeLabel,
        port.valueSchema,
        port.name
      )
      if (!parsed.ok) {
        errors[port.name] = parsed.error
        continue
      }
      input[port.name] = parsed.value
      const locator = locatorFromFileDraft(draft)
      if (locator) {
        const blob = filesByLocator.current.get(locator)
        if (blob) blobs.set(locator, blob)
      }
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    onRun(input, blobs.size() > 0 ? blobs : undefined)
  }

  return (
    <section>
      {ports.length > 0 ? (
        <div className="mb-4 space-y-3">
          <p className="font-mono text-label uppercase tracking-wide text-on-surface-variant">
            Run input
          </p>
          {ports.map((port: ReactFlowPort) => {
            const kind = editorKindForPort(port)
            return (
              <div key={port.id} className="space-y-1.5">
                <span className="font-mono text-label text-on-surface">
                  {port.name}
                  <span className="text-outline">:{port.typeLabel}</span>
                </span>
                <ConfigPortControl
                  fieldId={`run-${port.name}`}
                  port={port}
                  value={drafts[port.name] ?? ""}
                  busy={runBusy}
                  onChange={(next) => setDrafts((prev) => ({ ...prev, [port.name]: next }))}
                  filePickerEnabled={filePickerEnabled}
                  onFile={kind === "file" ? (file) => void applyFile(port, file) : undefined}
                />
                {fieldErrors[port.name] ? (
                  <span className="block text-label text-error">{fieldErrors[port.name]}</span>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
      <button
        type="button"
        disabled={runBusy || !hasWorkflow}
        onClick={handleRun}
        className="rounded bg-primary px-4 py-2 font-mono text-label font-bold text-on-primary hover:brightness-110 disabled:opacity-50"
      >
        {runBusy ? "Running..." : "Run workflow"}
      </button>
    </section>
  )
}
