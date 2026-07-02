const LOG_PREFIX = "[ecp:fluent-edit]"

/** Whether Fluent edit pipeline logging is enabled (dev by default). */
export function isFluentEditDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  const globalFlag = (globalThis as { __ecpFluentEditDebug?: boolean }).__ecpFluentEditDebug
  return globalFlag !== false
}

function log(event: string, detail?: Record<string, unknown>): void {
  if (!isFluentEditDebugEnabled()) return
  if (detail) {
    console.log(LOG_PREFIX, event, detail)
  } else {
    console.log(LOG_PREFIX, event)
  }
}

function logGroup(title: string, fn: () => void): void {
  if (!isFluentEditDebugEnabled()) return
  console.groupCollapsed(`${LOG_PREFIX} ${title}`)
  fn()
  console.groupEnd()
}

/** Monaco model content changed (editor layer). */
export function logFluentEditorChange(path: string, sourceLength: number, lineCount: number): void {
  log("editor:content-changed", { path, sourceLength, lineCount })
}

/** Parent received Fluent source from Monaco. */
export function logFluentChangeReceived(sourceLength: number, generation: number): void {
  log("app:onFluentChange", { sourceLength, generation })
}

/** Compile skipped before debounce (placeholder / empty). */
export function logFluentCompileSkipped(reason: string, detail?: Record<string, unknown>): void {
  log("app:compile-skipped", { reason, ...detail })
}

/** Debounced compile scheduled. */
export function logFluentCompileScheduled(generation: number, debounceMs: number): void {
  log("app:compile-scheduled", { generation, debounceMs })
}

/** Debounced compile fired. */
export function logFluentCompileStart(generation: number, sourceLength: number): void {
  logGroup(`compile #${generation} start`, () => {
    console.log("generation:", generation)
    console.log("sourceLength:", sourceLength)
    console.log("ecpReady:", Boolean((globalThis as { ecp?: unknown }).ecp))
    console.log("shimReady:", Boolean((globalThis as { __ecpWorkflowShim?: unknown }).__ecpWorkflowShim))
    console.log(
      "esbuildWasmUrl:",
      (globalThis as { __ecpEsbuildWasmUrl?: string }).__ecpEsbuildWasmUrl ?? "(unpkg fallback)"
    )
  })
}

/** Compile finished (success or failure). */
export function logFluentCompileResult(
  generation: number,
  result: {
    ok?: boolean
    hasManifest: boolean
    workflowLabel?: string
    stepCount?: number
    compileErrors?: string[]
    validationErrors?: string[]
  }
): void {
  logGroup(`compile #${generation} result`, () => {
    console.log("ok:", result.ok)
    console.log("hasManifest:", result.hasManifest)
    if (result.workflowLabel) console.log("workflowLabel:", result.workflowLabel)
    if (result.stepCount !== undefined) console.log("stepCount:", result.stepCount)
    if (result.compileErrors?.length) console.warn("compileErrors:", result.compileErrors)
    if (result.validationErrors?.length) console.warn("validationErrors:", result.validationErrors)
  })
}

/** Compile result discarded (newer generation). */
export function logFluentCompileStale(generation: number, currentGeneration: number): void {
  log("app:compile-stale", { generation, currentGeneration })
}

/** syncFromManifest started. */
export function logFluentSyncStart(
  source: "user-compile" | "assistant",
  refreshFluent: boolean,
  workflowLabel?: string
): void {
  logGroup(`syncFromManifest (${source})`, () => {
    console.log("refreshFluent:", refreshFluent)
    if (workflowLabel) console.log("workflowLabel:", workflowLabel)
  })
}

/** syncFromManifest finished; panels updated. */
export function logFluentSyncComplete(detail: {
  jsonLength: number
  toonLength: number
  mermaidLength: number
  validationValid?: boolean
}): void {
  log("app:sync-complete", detail)
}

/** syncFromManifest could not run. */
export function logFluentSyncSkipped(reason: string): void {
  log("app:sync-skipped", { reason })
}

/** Uncaught error in compile/sync pipeline. */
export function logFluentPipelineError(phase: string, err: unknown): void {
  if (!isFluentEditDebugEnabled()) return
  console.error(`${LOG_PREFIX} ${phase} error`, err)
}
