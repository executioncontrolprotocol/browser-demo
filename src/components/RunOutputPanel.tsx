/** Props for {@link RunOutputPanel}. */
export interface RunOutputPanelProps {
  runOutput: string
  runBusy: boolean
  onRun: () => void
  hasWorkflow: boolean
}

/** Run workflow and display JSON output. */
export function RunOutputPanel({ runOutput, runBusy, onRun, hasWorkflow }: RunOutputPanelProps) {
  return (
    <div>
      <button
        type="button"
        disabled={runBusy || !hasWorkflow}
        onClick={onRun}
        className="mb-4 rounded bg-primary px-4 py-2 font-mono text-label font-bold text-on-primary hover:brightness-110 disabled:opacity-50"
      >
        {runBusy ? "Running..." : "Run workflow"}
      </button>
      <pre className="max-h-[50vh] overflow-auto rounded border border-outline-variant/50 bg-surface-container-lowest p-4 font-mono text-label text-on-surface-variant whitespace-pre-wrap">
        {runOutput || "Run output will appear here."}
      </pre>
    </div>
  )
}

