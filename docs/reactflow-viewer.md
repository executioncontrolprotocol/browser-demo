# React Flow viewer

The browser demo **Workflow** canvas (`account_tree` nav) uses React Flow. Mermaid diagram + source live under Logic Source → Mermaid.

Shared encode contract:

[`REACTFLOW_RENDER.md`](../../executioncontrolprotocol/packages/extensions/format-reactflow/REACTFLOW_RENDER.md)

(path relative when repos are siblings; otherwise see `@executioncontrolprotocol/format-reactflow` in the core monorepo).

Summary for demo UI work:

- Flat action nodes; property-level `$ref` edges only
- Hollow vs solid handles; idle cyan routes; ants while running; green when source completed
- **Write-back (both paths → `ecp.patch` + `syncFromManifest`):**
  - **Configure** edits literals / adds unbound params / `as` → `.with({ … })` JSON values
  - **Connect** output→input draws a route → `input[param] = { $ref }` → Fluent `ref("…")`; delete edge removes that binding
  - Source step must have a store key (`as`) before connect; connecting over a literal replaces it
  - **Type compatibility:** only matching port kinds (`valueSchema` / `typeLabel`) can connect; `unknown` is permissive. While dragging an output, incompatible inputs are greyed with a crossed handle and rejected
- Configure + Inspect state; patch write-back keeps Fluent and Flow in sync
- **Opinionated type mapping** (demo-local; encode stays UI-neutral — no widget names in `format-reactflow`). Prefer port `valueSchema`; fall back to `typeLabel`. Other apps may map the same document differently:

  | `valueSchema` signal | Demo widget |
  | --- | --- |
  | `type: "string"` (no enum), short | Single-line text `<input>` |
  | `type: "string"`, long (`prompt` / `system` / … or length / newline) | Plain `<textarea>` |
  | `type: "object"` / `array` / empty / unknown | Monaco JSON |
  | `type: "number"` / `integer` | Number input |
  | `type: "boolean"` | Toggle switch |
  | `type: "string"` + `enum` (≤4 options) | Radio group |
  | `type: "string"` + `enum` (>4 options) | `<select>` dropdown |
  | `type: "array"` + `items.enum` | Checkbox multi-select → JSON array |
