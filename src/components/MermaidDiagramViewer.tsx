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
    return <p className="text-body text-error">{error}</p>
  }

  if (!svg) {
    return <p className="text-body text-on-surface-variant">Rendering diagram...</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-2" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
