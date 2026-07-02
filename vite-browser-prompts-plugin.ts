import { existsSync } from "node:fs"
import { join } from "node:path"
import type { Plugin } from "vite"

const NODE_BUILTIN_STUBS: Record<string, string> = {
  "node:fs": "node-fs-stub.ts",
  "node:fs/promises": "node-fs-promises-stub.ts",
  "node:path": "node-path-stub.ts",
  "node:url": "node-url-stub.ts",
  "node:os": "node-empty.ts",
  "node:http": "node-empty.ts",
  "node:child_process": "node-empty.ts",
  "node:util": "node-empty.ts",
  sharp: "sharp-stub.ts",
}

/**
 * Redirect harness prompt loaders and Node builtins to browser-safe modules.
 * Vite `resolve.alias` does not reliably match imports from linked monorepo packages.
 */
export function browserPromptLoaderPlugin(options: {
  corePromptsDir: string
  stubDir: string
}): Plugin {
  const { corePromptsDir, stubDir } = options

  function resolveCorePrompt(base: string): string {
    const jsPath = join(corePromptsDir, `${base}.browser.js`)
    if (existsSync(jsPath)) return jsPath
    return join(corePromptsDir, `${base}.browser.ts`)
  }

  function resolveSchemaPrompt(base: string): string {
    const jsPath = join(corePromptsDir, `${base}.browser.js`)
    if (existsSync(jsPath)) return jsPath
    return join(corePromptsDir, `${base}.browser.ts`)
  }

  function isPromptLoaderId(source: string): boolean {
    return (
      source === "./load-harness-prompt.js" ||
      source === "./load-harness-prompt.ts" ||
      source.endsWith("/load-harness-prompt.js") ||
      source.endsWith("/load-harness-prompt.ts")
    )
  }

  function isSchemaLoaderId(source: string): boolean {
    return (
      source === "./load-schema-example.js" ||
      source === "./load-schema-example.ts" ||
      source.endsWith("/load-schema-example.js") ||
      source.endsWith("/load-schema-example.ts")
    )
  }

  function isPromptNodeId(source: string): boolean {
    return source.includes("load-harness-prompt.node")
  }

  function isSchemaNodeId(source: string): boolean {
    return source.includes("load-schema-example.node")
  }

  return {
    name: "browser-prompt-loader",
    enforce: "pre",
    resolveId(source) {
      const nodeStub = NODE_BUILTIN_STUBS[source]
      if (nodeStub) {
        return join(stubDir, nodeStub)
      }
      if (isPromptLoaderId(source)) {
        return resolveCorePrompt("load-harness-prompt")
      }
      if (isSchemaLoaderId(source)) {
        return resolveSchemaPrompt("load-schema-example")
      }
      if (isPromptNodeId(source)) {
        return join(stubDir, "load-harness-prompt-node-stub.ts")
      }
      if (isSchemaNodeId(source)) {
        return join(stubDir, "load-schema-example-node-stub.ts")
      }
      return undefined
    },
  }
}
