import { useEffect, useId, useState } from "react"
import { renderMermaidDiagram } from "../lib/mermaid-render.js"

/** Props for {@link MermaidDiagramViewer}. */
export interface MermaidDiagramViewerProps {
  /** Mermaid flowchart source from @executioncontextprotocol/format-mermaid. */
  source: string
  /** Shown when source is empty. */
  emptyMessage?: string
}

/** Render a Mermaid diagram (not raw source). */
export function MermaidDiagramViewer({
  source,
  emptyMessage = "Generate a workflow to see the graph.",
}: MermaidDiagramViewerProps) {
  const baseId = useId().replace(/:/g, "")
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)

  useEffect(() => {
    if (!source.trim() || source.includes("empty[No workflow]")) {
      setSvg("")
      setError(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const html = await renderMermaidDiagram(source, `mmd-${baseId}`)
        if (!cancelled) {
          setSvg(html)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setSvg("")
          setError(err instanceof Error ? err.message : String(err))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source, baseId])

  if (!source.trim() || source.includes("empty[No workflow]")) {
    return <p className="text-body text-on-surface-variant">{emptyMessage}</p>
  }

  if (error) {
    return (
      <div>
        <p className="text-body text-error">{error}</p>
        <button
          type="button"
          className="mt-2 font-mono text-label text-primary underline"
          onClick={() => setShowSource((v) => !v)}
        >
          {showSource ? "Hide source" : "View source"}
        </button>
        {showSource ? (
          <pre className="mt-2 overflow-auto font-mono text-label text-on-surface-variant whitespace-pre-wrap">
            {source}
          </pre>
        ) : null}
      </div>
    )
  }

  if (!svg) {
    return <p className="text-body text-on-surface-variant">Rendering diagram...</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-2" dangerouslySetInnerHTML={{ __html: svg }} />
      <button
        type="button"
        className="mt-2 self-start font-mono text-label text-primary underline"
        onClick={() => setShowSource((v) => !v)}
      >
        {showSource ? "Hide source" : "View source"}
      </button>
      {showSource ? (
        <pre className="mt-2 max-h-40 overflow-auto font-mono text-label text-on-surface-variant whitespace-pre-wrap">
          {source}
        </pre>
      ) : null}
    </div>
  )
}
