import type { EnvironmentDescriptor } from "@executioncontrolprotocol/types"

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

  const id = descriptor.environment.id
  const label = descriptor.environment.label
  const labelArg = label && label !== id ? `, "${label.replace(/"/g, '\\"')}"` : ""
  const sorted = [...descriptor.extensions].sort((a, b) => a.order - b.order)
  const bindings =
    sorted.length > 0
      ? sorted.map((ext) => `  extension("${ext.id}").with({}),`).join("\n")
      : "  // No extensions bound."

  return `import { environment, extension } from "@executioncontrolprotocol/browser"

// View only — environment rebind is not yet supported in the browser demo.
export default await environment("${id}"${labelArg}).withExtensions([
${bindings}
])
`
}
