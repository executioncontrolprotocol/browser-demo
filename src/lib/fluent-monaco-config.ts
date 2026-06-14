import type { Monaco } from "@monaco-editor/react"

/** Monaco theme id for Solaris Slate. */
export const SOLARIS_SLATE_THEME = "solaris-slate"

/** Ambient types for browser Fluent source (`import from "@executioncontextprotocol/browser"`). Compile strips these imports. */
export const FLUENT_BROWSER_MODULE_LIB = `declare module "@executioncontextprotocol/browser" {
  export function workflow(label: string): WorkflowBuilder
  export function step(ref: string | undefined, label?: string): StepBuilder
  export function ref(key: string): unknown
  export function state(key: string): unknown
  export function env(key: string): unknown
  export function expr(source: string): unknown
  export function parallel(steps: unknown[]): unknown
  export function branch(branches: unknown[][]): unknown
  export function loop(body: unknown): unknown
  export function environment(id: string, label?: string): EnvironmentBuilder
  export function extension(id: string): ExtensionBuilder

  interface WorkflowBuilder {
    id(id: string): WorkflowBuilder
    run(nodes: unknown[]): WorkflowBuilder
  }

  interface StepBuilder {
    id(id: string): StepBuilder
    as(key: string): StepBuilder
    with(input: Record<string, unknown>): StepBuilder
    when(condition: unknown): StepBuilder
  }

  interface EnvironmentBuilder {
    withExtensions(extensions: unknown[]): EnvironmentBuilder
  }

  interface ExtensionBuilder {
    with(config: Record<string, unknown>): unknown
  }
}
`

/** Virtual URI for Fluent workflow source — must not overlap app source paths. */
export const FLUENT_EDITOR_PATH = "file:///ecp-workflow/workflow.ts"

let fluentMonacoConfigured = false

/** Register Solaris Slate editor colors. */
export function defineSolarisSlateTheme(monaco: Monaco): void {
  monaco.editor.defineTheme(SOLARIS_SLATE_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "4d4632", fontStyle: "italic" },
      { token: "keyword", foreground: "facc15" },
      { token: "string", foreground: "c7f5ff" },
      { token: "number", foreground: "15daf4" },
      { token: "type", foreground: "ffe083" },
      { token: "identifier", foreground: "dae2fd" },
    ],
    colors: {
      "editor.background": "#131b2e",
      "editor.foreground": "#dae2fd",
      "editorLineNumber.foreground": "#4d4632",
      "editorLineNumber.activeForeground": "#9a9078",
      "editor.selectionBackground": "#222a3d",
      "editor.inactiveSelectionBackground": "#171f33",
      "editorCursor.foreground": "#facc15",
      "editor.lineHighlightBackground": "#171f33",
    },
  })
}

/** Register virtual @executioncontextprotocol/browser types so Monaco does not report TS2792 on generated Fluent source. */
export function configureFluentMonaco(monaco: Monaco): void {
  defineSolarisSlateTheme(monaco)

  if (fluentMonacoConfigured) return
  fluentMonacoConfigured = true

  const defaults = monaco.languages.typescript.typescriptDefaults
  defaults.setCompilerOptions({
    ...defaults.getCompilerOptions(),
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeNext,
    allowNonTsExtensions: true,
    noEmit: true,
    strict: false,
  })
  defaults.addExtraLib(FLUENT_BROWSER_MODULE_LIB, "file:///node_modules/@types/ecp-browser/index.d.ts")
  defaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  })
}
