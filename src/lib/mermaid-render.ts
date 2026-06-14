import mermaid from "mermaid"

let mermaidReady = false

/** Render Mermaid source to SVG HTML string. */
export async function renderMermaidDiagram(source: string, id: string): Promise<string> {
  if (!source.trim()) throw new Error("Empty Mermaid source")
  if (!mermaidReady) {
    mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" })
    mermaidReady = true
  }
  const { svg } = await mermaid.render(id, source)
  return svg
}
