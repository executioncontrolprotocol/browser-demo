import { useEffect, useMemo, useState } from "react"
import type { CapabilityBlobStore } from "@executioncontrolprotocol/core"
import type { BridgeSettings } from "../lib/ecp-bridge.js"
import { collectFinalOutputMediaRefs } from "../lib/run-media-refs.js"
import {
  collectRunFailureMessages,
  isFailedRunResult,
} from "../lib/run-progress-sync.js"
import {
  resolveMediaPreview,
  type ResolvedMediaPreview,
} from "../lib/resolve-media-preview.js"
import { RunInputForm } from "./RunInputForm.js"

/** Which sections the workflow state modal shows. @category Demo */
export type RunModalMode = "input" | "output" | "inspect"

/** Props for {@link RunResultModal}. */
export interface RunResultModalProps {
  open: boolean
  onClose: () => void
  /** input = play form; output = post-run; inspect = canvas control (all). */
  mode: RunModalMode
  /** Parsed run result (or error string wrapped by caller). */
  runResult: unknown
  /** Pretty JSON for the full dump. */
  runOutputJson: string
  /** Optional `result.output` JSON. */
  runPublicOutput?: string
  bridge?: BridgeSettings
  blobs?: CapabilityBlobStore
  runBusy: boolean
  onRun: (input?: Record<string, unknown>, blobs?: CapabilityBlobStore) => void
  hasWorkflow: boolean
  acceptsSchema?: Record<string, unknown>
  filePickerEnabled?: boolean
}

function MediaPreview({ item }: { item: ResolvedMediaPreview }) {
  if (item.error) {
    return <p className="text-label text-error">{item.error}</p>
  }
  if (!item.url) {
    return <p className="text-label text-on-surface-variant">No preview available.</p>
  }
  switch (item.previewKind) {
    case "image":
      return (
        <img
          src={item.url}
          alt={item.name || item.path}
          className="max-h-64 max-w-full rounded border border-outline-variant/40 object-contain"
        />
      )
    case "video":
      return (
        <video
          src={item.url}
          controls
          className="max-h-64 max-w-full rounded border border-outline-variant/40"
        />
      )
    case "audio":
      return <audio src={item.url} controls className="w-full" />
    case "pdf":
      return (
        <iframe
          title={item.name || item.path}
          src={item.url}
          className="h-64 w-full rounded border border-outline-variant/40 bg-surface-container-lowest"
        />
      )
    default:
      return (
        <p className="font-mono text-label text-on-surface-variant">
          {item.mediaType} · use Open to view in the browser
        </p>
      )
  }
}

function titleForMode(mode: RunModalMode): string {
  switch (mode) {
    case "input":
      return "Run workflow"
    case "output":
      return "Run output"
    case "inspect":
      return "Workflow state"
  }
}

/**
 * Workflow state modal: input-only, output-only, or full inspect.
 * @category Demo
 */
export function RunResultModal({
  open,
  onClose,
  mode,
  runResult,
  runOutputJson,
  runPublicOutput,
  bridge,
  blobs,
  runBusy,
  onRun,
  hasWorkflow,
  acceptsSchema,
  filePickerEnabled = false,
}: RunResultModalProps) {
  const mediaRefs = useMemo(() => collectFinalOutputMediaRefs(runResult), [runResult])
  const failureMessages = useMemo(() => collectRunFailureMessages(runResult), [runResult])
  const failed = isFailedRunResult(runResult)
  const [previews, setPreviews] = useState<ResolvedMediaPreview[]>([])
  const [loading, setLoading] = useState(false)
  const showInput = mode === "input" || mode === "inspect"
  const showOutput = mode === "output" || mode === "inspect"
  const hasResult = Boolean(runOutputJson)

  useEffect(() => {
    if (!open || !showOutput) {
      setPreviews([])
      setLoading(false)
      return
    }
    let cancelled = false
    const created: string[] = []
    setLoading(true)
    void (async () => {
      const resolved = await Promise.all(
        mediaRefs.map((ref) => resolveMediaPreview(ref, { bridge, blobs }))
      )
      if (cancelled) {
        for (const item of resolved) {
          if (item.revokeUrl && item.url) URL.revokeObjectURL(item.url)
        }
        return
      }
      for (const item of resolved) {
        if (item.revokeUrl && item.url) created.push(item.url)
      }
      setPreviews(resolved)
      setLoading(false)
    })()
    return () => {
      cancelled = true
      for (const url of created) URL.revokeObjectURL(url)
      setPreviews((prev) => {
        for (const item of prev) {
          if (item.revokeUrl && item.url) URL.revokeObjectURL(item.url)
        }
        return []
      })
    }
  }, [open, showOutput, mediaRefs, bridge, blobs])

  if (!open) return null

  const openNative = (item: ResolvedMediaPreview) => {
    const target = item.hostOpenUrl || item.url
    if (!target) return
    window.open(target, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      className="modal-overlay modal-overlay--elevated"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-result-title"
      onClick={onClose}
    >
      <div className="modal-panel modal-panel--run-output" onClick={(e) => e.stopPropagation()}>
        <header className="modal-panel-header">
          <h2 id="run-result-title" className="font-display text-headline text-on-surface">
            {titleForMode(mode)}
          </h2>
          <button
            type="button"
            className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            aria-label="Close"
          >
            close
          </button>
        </header>
        <div className="modal-panel-scroll flex flex-col gap-6">
          {showInput ? (
            <RunInputForm
              runBusy={runBusy}
              onRun={onRun}
              hasWorkflow={hasWorkflow}
              acceptsSchema={acceptsSchema}
              filePickerEnabled={filePickerEnabled}
            />
          ) : null}

          {showOutput && failed && failureMessages.length > 0 ? (
            <section className="space-y-2">
              <p className="font-mono text-label uppercase tracking-wide text-error">Errors</p>
              <ul className="space-y-1 rounded border border-error/40 bg-error/5 p-3">
                {failureMessages.map((message) => (
                  <li key={message} className="font-mono text-label text-error whitespace-pre-wrap">
                    {message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showOutput && hasResult ? (
            <section className="space-y-3">
              <p className="font-mono text-label uppercase tracking-wide text-on-surface-variant">
                Media
              </p>
              {loading ? (
                <p className="text-label text-on-surface-variant">Loading previews…</p>
              ) : mediaRefs.length === 0 ? (
                <p className="text-label text-on-surface-variant">No media in workflow output.</p>
              ) : (
                <ul className="space-y-4">
                  {previews.map((item) => (
                    <li
                      key={item.path}
                      className="rounded border border-outline-variant/40 bg-surface-container-lowest p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-label text-on-surface">{item.path}</p>
                          <p className="font-mono text-label text-on-surface-variant">
                            {item.name ? `${item.name} · ` : ""}
                            {item.mediaType}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!item.url && !item.hostOpenUrl}
                          onClick={() => openNative(item)}
                          className="rounded bg-primary px-3 py-1.5 font-mono text-label font-bold text-on-primary hover:brightness-110 disabled:opacity-40"
                        >
                          Open
                        </button>
                      </div>
                      <MediaPreview item={item} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {showOutput && runPublicOutput ? (
            <section>
              <p className="mb-2 font-mono text-label uppercase tracking-wide text-on-surface-variant">
                Output
              </p>
              <pre className="max-h-[20vh] overflow-auto rounded border border-outline-variant/50 bg-surface-container-lowest p-3 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
                {runPublicOutput}
              </pre>
            </section>
          ) : null}

          {showOutput ? (
            <section>
              <p className="mb-2 font-mono text-label uppercase tracking-wide text-on-surface-variant">
                Full state
              </p>
              <pre className="max-h-[30vh] overflow-auto rounded border border-outline-variant/50 bg-surface-container-lowest p-3 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
                {runOutputJson || "Run output will appear here."}
              </pre>
            </section>
          ) : null}
        </div>
        <footer className="modal-panel-footer">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-outline-variant px-4 py-2 font-mono text-label text-on-surface hover:bg-surface-container-high"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
