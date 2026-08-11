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
    ],
    alias: {
      esbuild: "esbuild-wasm",
      "@executioncontrolprotocol/core/compile": aliasPath(coreCompileBrowserEntry),
      "node:fs/promises": aliasPath(stubDir, "node-fs-promises-stub.ts"),
      "node:fs": aliasPath(stubDir, "node-fs-stub.ts"),
      "node:path": aliasPath(stubDir, "node-path-stub.ts"),
      "node:url": aliasPath(stubDir, "node-url-stub.ts"),
      "node:os": aliasPath(stubDir, "node-empty.ts"),
      "node:http": aliasPath(stubDir, "node-empty.ts"),
      "node:child_process": aliasPath(stubDir, "node-empty.ts"),
      "node:util": aliasPath(stubDir, "node-empty.ts"),
      sharp: aliasPath(stubDir, "sharp-stub.ts"),
    },
  },
  optimizeDeps: {
    exclude: [
      "@executioncontrolprotocol/core",
      "@executioncontrolprotocol/browser",
      "@executioncontrolprotocol/extension-fal",
      "@executioncontrolprotocol/extension-image-sharp",
      "@executioncontrolprotocol/format-mermaid",
      "@executioncontrolprotocol/format-toon",
      // Keep Vite `import.meta.glob` for harness prompt fixtures (esbuild prebundle strips it).
      "@executioncontrolprotocol/harnesses-browser-nano",
      "@executioncontrolprotocol/harnesses-browser-coding",
    ],
  },
})
