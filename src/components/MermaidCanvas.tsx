import { MermaidDiagramViewer } from "./MermaidDiagramViewer.js"
import { PanelHeader } from "./PanelHeader.js"
import { RunOutputPanel } from "./RunOutputPanel.js"

/** Props for {@link MermaidCanvas}. */
export interface MermaidCanvasProps {
  mermaid: string
  runOutput: string
  runBusy: boolean
  runOverlayOpen: boolean
  onCloseRunOverlay: () => void
  onRun: () => void
  hasWorkflow: boolean
}

/** Workflow graph canvas with optional run output overlay. */
export function MermaidCanvas({
  mermaid,
  runOutput,
  runBusy,
  runOverlayOpen,
  onCloseRunOverlay,
  onRun,
  hasWorkflow,
}: MermaidCanvasProps) {
  return (
    <section
      className="node-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      id="graph-drawer"
    >
      <PanelHeader icon="account_tree" label="Workflow Canvas" />

      <div className={`flex min-h-0 flex-1 flex-col p-canvas-padding ${runOverlayOpen ? "opacity-40" : ""}`}>
        {hasWorkflow ? (
          <MermaidDiagramViewer source={mermaid} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-md text-center font-body text-body text-on-surface-variant">
              Generate a workflow via chat to see the graph here.
            </p>
          </div>
        )}
      </div>

      {runOverlayOpen ? (
        <div className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-background/70 p-6 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col rounded-xl border border-outline-variant bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-headline text-on-surface">Run output</h2>
              <button
                type="button"
                className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-on-surface"
                onClick={onCloseRunOverlay}
                aria-label="Close"
              >
                close
              </button>
            </div>
            <RunOutputPanel runOutput={runOutput} runBusy={runBusy} onRun={onRun} hasWorkflow={hasWorkflow} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
