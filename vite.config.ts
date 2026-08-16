import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { browserPromptLoaderPlugin } from "./vite-browser-prompts-plugin.js"

const appRoot = dirname(fileURLToPath(import.meta.url))
const coreBrowserEntry = fileURLToPath(import.meta.resolve("@executioncontrolprotocol/core/browser"))
const coreCompileBrowserEntry = join(
  dirname(coreBrowserEntry),
  "compile",
  "index.browser.js"
)
const corePrompts = join(dirname(coreBrowserEntry), "harness/prompts")
const stubDir = join(appRoot, "src/stubs")

/** Vite alias target (forward slashes — required on Windows). */
function aliasPath(...segments: string[]): string {
  return join(...segments).replace(/\\/g, "/")
}

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1]
const pagesBase =
  process.env.GITHUB_PAGES === "true" && repoName ? `/${repoName}/` : "/"

export default defineConfig({
  base: pagesBase,
  plugins: [
    browserPromptLoaderPlugin({ corePromptsDir: corePrompts, stubDir }),
    react(),
  ],
  server: { port: 5173 },
  resolve: {
    dedupe: [
      "@executioncontrolprotocol/core",
      "@executioncontrolprotocol/types",
      "@executioncontrolprotocol/chrome-ai",
    ],
    alias: [
      // Exact bare specifier only — do not break `esbuild-wasm/esbuild.wasm?url` or ESM subpaths.
      {
        find: /^esbuild-wasm$/,
        replacement: aliasPath(appRoot, "node_modules/esbuild-wasm/esm/browser.js"),
      },
      {
        find: /^esbuild$/,
        replacement: aliasPath(appRoot, "node_modules/esbuild-wasm/esm/browser.js"),
      },
      {
        find: "@executioncontrolprotocol/core/compile",
        replacement: aliasPath(coreCompileBrowserEntry),
      },
      {
        find: "node:fs/promises",
        replacement: aliasPath(stubDir, "node-fs-promises-stub.ts"),
      },
      {
        find: "node:fs",
        replacement: aliasPath(stubDir, "node-fs-stub.ts"),
      },
      {
        find: "node:path",
        replacement: aliasPath(stubDir, "node-path-stub.ts"),
      },
      {
        find: "node:url",
        replacement: aliasPath(stubDir, "node-url-stub.ts"),
      },
      {
        find: "node:os",
        replacement: aliasPath(stubDir, "node-empty.ts"),
      },
      {
        find: "node:http",
        replacement: aliasPath(stubDir, "node-empty.ts"),
      },
      {
        find: "node:child_process",
        replacement: aliasPath(stubDir, "node-empty.ts"),
      },
      {
        find: "node:util",
        replacement: aliasPath(stubDir, "node-empty.ts"),
      },
      // Native Node only — image-sharp cannot run in the browser bundle.
      {
        find: "sharp",
        replacement: aliasPath(stubDir, "sharp-stub.ts"),
      },
    ],
  },
  optimizeDeps: {
    // Prebundle CJS `@fal-ai/client` so named ESM imports work (real client, not a stub).
    include: ["@fal-ai/client"],
    exclude: [
      "@executioncontrolprotocol/core",
      "@executioncontrolprotocol/browser",
      "@executioncontrolprotocol/chrome-ai",
      "@executioncontrolprotocol/extension-fal",
      "@executioncontrolprotocol/extension-image-sharp",
      "@executioncontrolprotocol/format-mermaid",
      "@executioncontrolprotocol/format-reactflow",
      "@executioncontrolprotocol/format-toon",
      // Keep Vite `import.meta.glob` for harness prompt fixtures (esbuild prebundle strips it).
      "@executioncontrolprotocol/harnesses-browser-nano",
      "@executioncontrolprotocol/harnesses-browser-coding",
      // Worker + wasm glue must not be prebundled (breaks initialize/transform).
      "esbuild-wasm",
    ],
  },
})
