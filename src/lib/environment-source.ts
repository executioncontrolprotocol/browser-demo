import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"
import { toAuthoringEnvironmentDescriptor } from "@executioncontrolprotocol/core"

/** Virtual URI for environment Fluent source in Monaco. */
export const ENVIRONMENT_EDITOR_PATH = "file:///ecp-workflow/environment.ts"

/** Synthesize browser environment Fluent source from a describe() descriptor. */
export function environmentSourceFromDescriptor(descriptor: EnvironmentDescriptor | null): string {
  if (!descriptor) {
    return `import { environment, extension } from "@executioncontrolprotocol/browser"

// Environment not loaded yet.
export default await environment("browser-demo-app").withExtensions([
  extension("@executioncontrolprotocol/chrome-ai").with({}),
  extension("@executioncontrolprotocol/ollama").with({}),
])
`
  }

  // App tooling (formats, browser host) stays registered for the UI but is omitted here —
  // this panel reflects the authoring/workflow inventory only.
  const authoring = toAuthoringEnvironmentDescriptor(descriptor)
  const id = authoring.environment.id
  const label = authoring.environment.label
  const labelArg = label && label !== id ? `, "${label.replace(/"/g, '\\"')}"` : ""
  const sorted = [...authoring.extensions].sort((a, b) => a.order - b.order)
  const bindings =
    sorted.length > 0
      ? sorted.map((ext) => `  extension("${ext.id}").with({}),`).join("\n")
      : "  // No workflow extensions bound."

  return `import { environment, extension } from "@executioncontrolprotocol/browser"

// View only — environment rebind is not yet supported in the browser demo.
// Formats and browser host extensions are app tooling (registered, not listed here).
export default await environment("${id}"${labelArg}).withExtensions([
${bindings}
])
`
}
