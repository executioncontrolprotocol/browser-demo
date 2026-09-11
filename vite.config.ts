import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { existsSync } from "node:fs"
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

function optionalVendorAlias(pkg: string, stubFile: string) {
  const pkgJson = join(appRoot, "node_modules", ...pkg.split("/"), "package.json")
  if (existsSync(pkgJson)) return null
  return {
    find: pkg,
    replacement: aliasPath(stubDir, stubFile),
  }
}

const optionalVendorAliases = [
  optionalVendorAlias(
    "@executioncontrolprotocol/azure-blob-storage",
    "optional-azure-blob-storage.ts",
  ),
  optionalVendorAlias(
    "@executioncontrolprotocol/adobe-firefly-services",
    "optional-adobe-firefly-services.ts",
  ),
].filter((a): a is NonNullable<typeof a> => a !== null)

/** Deploy at domain root (custom domain). Override with VITE_BASE for a subpath. */
const pagesBase = process.env.VITE_BASE?.trim() || "/"

export default defineConfig({
  base: pagesBase,
  plugins: [
    browserPromptLoaderPlugin({ corePromptsDir: corePrompts, stubDir }),
    react(),
  ],
  server: {
    port: 5173,
    // Bind IPv4 + IPv6 so http://localhost:5173/ works on Windows (default [::1]-only breaks).
    host: true,
    strictPort: true,
    // Linked `file:` / npm-link packages live outside browser-demo (core + extensions monorepos).
    fs: {
      allow: [
        appRoot,
        join(appRoot, "../executioncontrolprotocol"),
        join(appRoot, "../extensions"),
      ],
    },
  },
  resolve: {
    dedupe: [
      "@executioncontrolprotocol/core",
      "@executioncontrolprotocol/types",
      "@executioncontrolprotocol/chrome-ai",
    ],
    alias: [
      ...optionalVendorAliases,
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
    ],
  },
  optimizeDeps: {
    // Prebundle CJS `@fal-ai/client` when the optional fal vendor package is linked.
    include: existsSync(join(appRoot, "node_modules", "@fal-ai", "client", "package.json"))
      ? ["@fal-ai/client"]
      : [],
    exclude: [
      "@executioncontrolprotocol/core",
      "@executioncontrolprotocol/browser",
      "@executioncontrolprotocol/chrome-ai",
      "@executioncontrolprotocol/fal",
      "@executioncontrolprotocol/image-sharp",
      "@executioncontrolprotocol/jsonata",
      "@executioncontrolprotocol/azure-blob-storage",
      "@executioncontrolprotocol/adobe-firefly-services",
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
