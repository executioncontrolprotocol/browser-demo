import { useEffect, useMemo, useState } from "react"
import type { CapabilityBlobStore } from "@executioncontrolprotocol/core"
import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import type { BridgeSettings } from "../lib/ecp-bridge.js"
import { runFormPortsFromReturns } from "../lib/workflow-io.js"
import { editorKindForPort } from "../lib/step-configure.js"
import {
  formatScalarDisplay,
  isMediaReturnValue,
  isStructuredReturnDisplay,
  mediaRefsForReturnValue,
  valueForReturnPort,
} from "../lib/run-output-view.js"
import {
  resolveMediaPreview,
  type ResolvedMediaPreview,
} from "../lib/resolve-media-preview.js"
import { MediaPreview } from "./MediaPreview.js"

/** Props for {@link RunOutputView}. */
export interface RunOutputViewProps {
  /** Workflow `returns` JSON Schema. */
  returnsSchema?: Record<string, unknown>
  /** `result.output` object (or undefined when empty). */
  output?: unknown
  /** Optional bridge for host artifact resolution. */
  bridge?: BridgeSettings
  /** Optional run blobs for file previews. */
  blobs?: CapabilityBlobStore
  /** Compact layout for chat bubbles. */
  compact?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function openNative(item: ResolvedMediaPreview): void {
  const target = item.hostOpenUrl || item.url
  if (!target) return
  window.open(target, "_blank", "noopener,noreferrer")
}

function ReturnMediaField({
  port,
  value,
  bridge,
  blobs,
}: {
  port: ReactFlowPort
  value: unknown
  bridge?: BridgeSettings
  blobs?: CapabilityBlobStore
}) {
  const refs = useMemo(() => mediaRefsForReturnValue(port.name, value), [port.name, value])
  const [previews, setPreviews] = useState<ResolvedMediaPreview[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (refs.length === 0) {
      setPreviews([])
      setLoading(false)
      return
    }
    let cancelled = false
    const created: string[] = []
    setLoading(true)
    void (async () => {
      const resolved = await Promise.all(refs.map((ref) => resolveMediaPreview(ref, { bridge, blobs })))
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
  }, [refs, bridge, blobs])

  if (loading) {
    return <p className="text-label text-on-surface-variant">Loading preview…</p>
  }
  if (refs.length === 0) {
    return (
      <pre className="max-h-40 overflow-auto rounded border border-outline-variant/40 bg-surface-container-lowest p-2 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
        {formatScalarDisplay(value, "file")}
      </pre>
    )
  }
  return (
    <ul className="space-y-3">
      {previews.map((item) => (
        <li
          key={item.path}
          className="rounded border border-outline-variant/40 bg-surface-container-lowest p-2"
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
              className="rounded bg-primary px-2.5 py-1 font-mono text-label font-bold text-on-primary hover:brightness-110 disabled:opacity-40"
            >
              Open
            </button>
          </div>
          <MediaPreview item={item} />
        </li>
      ))}
    </ul>
  )
}

function ReturnFieldValue({
  port,
  value,
  present,
  bridge,
  blobs,
}: {
  port: ReactFlowPort
  value: unknown
  present: boolean
  bridge?: BridgeSettings
  blobs?: CapabilityBlobStore
}) {
  if (!present) {
    return <p className="text-label text-on-surface-variant">Missing</p>
  }
  const kind = editorKindForPort(port)
  if (isMediaReturnValue(port, value)) {
    return <ReturnMediaField port={port} value={value} bridge={bridge} blobs={blobs} />
  }
  if (isStructuredReturnDisplay(value, kind)) {
    return (
      <pre className="max-h-48 overflow-auto rounded border border-outline-variant/40 bg-surface-container-lowest p-2 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
        {formatScalarDisplay(value, kind)}
      </pre>
    )
  }
  if (kind === "longtext") {
    return (
      <p className="whitespace-pre-wrap text-body text-on-surface">
        {formatScalarDisplay(value, kind)}
      </p>
    )
  }
  return (
    <p className="whitespace-pre-wrap font-mono text-label text-on-surface">
      {formatScalarDisplay(value, kind)}
    </p>
  )
}

/**
 * Schema-mapped read-only view of `result.output` (twin of {@link RunInputForm}).
 * @category Demo
 */
export function RunOutputView({
  returnsSchema,
  output,
  bridge,
  blobs,
  compact = false,
}: RunOutputViewProps) {
  const ports = useMemo(() => runFormPortsFromReturns(returnsSchema), [returnsSchema])
  const hasOutputObject = isRecord(output)
  const outputEmpty =
    output === undefined ||
    output === null ||
    (hasOutputObject && Object.keys(output).length === 0)

  if (ports.length === 0) {
    return (
      <p className="text-label text-on-surface-variant">
        {outputEmpty ? "No returns schema or output to display." : "No returns schema to map."}
      </p>
    )
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact ? (
        <p className="font-mono text-label uppercase tracking-wide text-on-surface-variant">
          Output
        </p>
      ) : null}
      {ports.map((port) => {
        const present = hasOutputObject && port.name in output
        const value = valueForReturnPort(output, port.name)
        return (
          <div key={port.id} className="space-y-1">
            <span className="font-mono text-label text-on-surface">
              {port.name}
              <span className="text-outline">:{port.typeLabel}</span>
            </span>
            <ReturnFieldValue
              port={port}
              value={value}
              present={present}
              bridge={bridge}
              blobs={blobs}
            />
          </div>
        )
      })}
    </div>
  )
}
