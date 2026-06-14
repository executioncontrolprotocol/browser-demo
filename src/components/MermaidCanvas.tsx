import type { ValidationResult } from "@executioncontextprotocol/types"
import { MermaidDiagramViewer } from "./MermaidDiagramViewer.js"
import { ValidationView } from "./ValidationView.js"
import { RunOutputPanel } from "./RunOutputPanel.js"
import type { AppNavTab } from "../types/workspace.js"

/** Props for {@link MermaidCanvas}. */
export interface MermaidCanvasProps {
  mermaid: string
  activeNav: AppNavTab
  validation: ValidationResult | null
  runOutput: string
  runBusy: boolean
  onRun: () => void
  hasWorkflow: boolean
}

/** Right canvas: Mermaid diagram with optional validation/run overlays. */
export function MermaidCanvas({
  mermaid,
  activeNav,
  validation,
  runOutput,
  runBusy,
  onRun,
  hasWorkflow,
}: MermaidCanvasProps) {
  const showValidation = activeNav === "validation"
  const showRun = activeNav === "run"
  const dimmed = showValidation || showRun

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className={`flex min-h-0 flex-1 flex-col p-canvas-padding ${dimmed ? "opacity-40" : ""}`}>
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

      {showValidation ? (
        <div className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-background/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container p-6 glow-primary">
            <h2 className="mb-4 font-display text-headline text-on-surface">Validation</h2>
            <ValidationView validation={validation} />
          </div>
        </div>
      ) : null}

      {showRun ? (
        <div className="absolute inset-0 z-20 flex items-start justify-center overflow-auto bg-background/70 p-6 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col rounded-xl border border-outline-variant bg-surface-container p-6">
            <h2 className="mb-4 font-display text-headline text-on-surface">Run output</h2>
            <RunOutputPanel runOutput={runOutput} runBusy={runBusy} onRun={onRun} hasWorkflow={hasWorkflow} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
