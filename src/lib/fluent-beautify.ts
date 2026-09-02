import { renderWorkflowToFluent } from "@executioncontrolprotocol/core/browser"
import type { ValidationResult, WorkflowManifest } from "@executioncontrolprotocol/types"

/** Same guard as compile-on-edit: skip placeholder / empty editor source. */
export function shouldBeautifyFluentSource(source: string | undefined): source is string {
  if (source === undefined) return false
  const trimmed = source.trim()
  if (!trimmed || trimmed.startsWith("// Fluent API will appear here")) return false
  return true
}

/** Render canonical pretty-printed Fluent for a workflow manifest. */
export function formatFluentManifest(manifest: WorkflowManifest): string {
  return renderWorkflowToFluent(manifest, {
    importFrom: "@executioncontrolprotocol/browser",
  })
}

export type BeautifyFluentResult =
  | { ok: true; manifest: WorkflowManifest; fluent: string; validation?: ValidationResult }
  | { ok: false; error: string }

/**
 * Compile current Fluent source and re-render with canonical pretty-printed output.
 */
export async function beautifyFluentWorkflowSource(source: string): Promise<BeautifyFluentResult> {
  const { compileWorkflowSource } = await import("@executioncontrolprotocol/core/browser")
  const compiled = await compileWorkflowSource({
    source,
    filename: "workflow.ts",
    resolveImports: "browser-global",
  })

  if (!compiled.manifest) {
    const error =
      compiled.compileErrors?.map((item) => item.message).join("; ") ??
      compiled.validation?.errors?.[0]?.message ??
      "Compile failed"
    return { ok: false, error }
  }

  return {
    ok: true,
    manifest: compiled.manifest,
    fluent: formatFluentManifest(compiled.manifest),
    validation: compiled.validation,
  }
}
