import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import {
  createBrowserFileLocator,
  createCapabilityBlobStore,
  type CapabilityBlobStore,
} from "@executioncontrolprotocol/core"
import { ConfigPortControl } from "./ConfigFieldControl.js"
import { draftForPort, parseEditedLiteral } from "../lib/step-configure.js"
import { runFormPortsFromAccepts } from "../lib/workflow-io.js"
import { capabilityBlobFromFile, isRunFormFilePort } from "../lib/run-form-files.js"

/** Props for {@link RunOutputPanel}. */
export interface RunOutputPanelProps {
  runOutput: string
  runBusy: boolean
  onRun: (input?: Record<string, unknown>, blobs?: CapabilityBlobStore) => void
  hasWorkflow: boolean
  acceptsSchema?: Record<string, unknown>
  runPublicOutput?: string
  /** File picker for locator fields; off when the demo is unpaired. */
  filePickerEnabled?: boolean
}

/** Run workflow, collect `accepts` input, and display JSON output. */
export function RunOutputPanel({
  runOutput,
  runBusy,
  onRun,
  hasWorkflow,
  acceptsSchema,
  runPublicOutput,
  filePickerEnabled = false,
}: RunOutputPanelProps) {
  const ports = useMemo(() => runFormPortsFromAccepts(acceptsSchema), [acceptsSchema])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const filesByLocator = useRef(new Map<string, File>())

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const port of ports) {
      next[port.name] = draftForPort(port, undefined)
    }
    setDrafts(next)
    setFieldErrors({})
    filesByLocator.current.clear()
  }, [ports])

  const stashFile = (portName: string, file: File) => {
    const locator = createBrowserFileLocator()
    filesByLocator.current.set(locator, file)
    setDrafts((prev) => ({ ...prev, [portName]: locator }))
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
      const parsed = parseEditedLiteral(
        drafts[port.name] ?? "",
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
      if (typeof parsed.value === "string") {
        const file = filesByLocator.current.get(parsed.value)
        if (file) blobs.set(parsed.value, capabilityBlobFromFile(file))
      }
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    onRun(input, blobs.size() > 0 ? blobs : undefined)
  }

  return (
    <div>
      {ports.length > 0 ? (
        <div className="mb-4 space-y-3">
          <p className="font-mono text-label uppercase tracking-wide text-on-surface-variant">
            Run input
          </p>
          {ports.map((port: ReactFlowPort) => (
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
              />
              {isRunFormFilePort(port) ? (
                <div className="space-y-1">
                  <input
                    type="file"
                    className="block w-full font-mono text-label text-on-surface-variant file:mr-2 file:rounded file:border file:border-outline-variant file:bg-surface-container-high file:px-2 file:py-1 file:font-mono file:text-label"
                    disabled={runBusy || !filePickerEnabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) stashFile(port.name, file)
                    }}
                  />
                  {!filePickerEnabled ? (
                    <span className="block text-label text-on-surface-variant">
                      File picker requires a local host. Start `ecp up --env …` to upload at step
                      time. Paste an https URL for local capabilities.
                    </span>
                  ) : null}
                </div>
              ) : null}
              {fieldErrors[port.name] ? (
                <span className="block text-label text-error">{fieldErrors[port.name]}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        disabled={runBusy || !hasWorkflow}
        onClick={handleRun}
        className="mb-4 rounded bg-primary px-4 py-2 font-mono text-label font-bold text-on-primary hover:brightness-110 disabled:opacity-50"
      >
        {runBusy ? "Running..." : "Run workflow"}
      </button>
      {runPublicOutput ? (
        <div className="mb-4">
          <p className="mb-2 font-mono text-label uppercase tracking-wide text-on-surface-variant">
            Output
          </p>
          <pre className="max-h-[20vh] overflow-auto rounded border border-outline-variant/50 bg-surface-container-lowest p-4 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
            {runPublicOutput}
          </pre>
        </div>
      ) : null}
      <pre className="max-h-[50vh] overflow-auto rounded border border-outline-variant/50 bg-surface-container-lowest p-4 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
        {runOutput || "Run output will appear here."}
      </pre>
    </div>
  )
}
