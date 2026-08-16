import { useEffect, useId, useRef, useState } from "react"
import { renderMermaidDiagram } from "../lib/mermaid-render.js"

/** Props for {@link MermaidDiagramViewer}. */
export interface MermaidDiagramViewerProps {
  /** Mermaid flowchart source from @executioncontrolprotocol/format-mermaid. */
  source: string
  /** Shown when source is empty. */
  emptyMessage?: string
}

function MermaidStatusMessage({
  children,
  tone = "muted",
}: {
  children: string
  tone?: "muted" | "error"
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center p-canvas-padding">
      <p
        className={`max-w-md text-center font-mono text-body ${
          tone === "error" ? "text-error" : "text-on-surface-variant"
        }`}
      >
        {children}
      </p>
    </div>
  )
}

/** Render a Mermaid diagram (not raw source). */
export function MermaidDiagramViewer({
  source,
  emptyMessage = "Generate a workflow via chat to see the graph here.",
}: MermaidDiagramViewerProps) {
  const baseId = useId().replace(/:/g, "")
  const renderSeq = useRef(0)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!source.trim() || source.includes("empty[No workflow]")) {
      setSvg("")
      setError(null)
      return
    }
    const renderId = `mmd-${baseId}-${++renderSeq.current}`
    let cancelled = false
    void (async () => {
      try {
        const html = await renderMermaidDiagram(source, renderId)
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
    return <MermaidStatusMessage>{emptyMessage}</MermaidStatusMessage>
  }

  if (error) {
    return <MermaidStatusMessage tone="error">{error}</MermaidStatusMessage>
  }

  if (!svg) {
    return <MermaidStatusMessage>Rendering diagram...</MermaidStatusMessage>
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-2" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
