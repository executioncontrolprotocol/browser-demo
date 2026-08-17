# React Flow viewer

The browser demo **Workflow** canvas (`account_tree` nav) uses React Flow. Mermaid diagram + source live under Logic Source → Mermaid.

Shared encode contract:

[`REACTFLOW_RENDER.md`](../../executioncontrolprotocol/packages/extensions/format-reactflow/REACTFLOW_RENDER.md)

(path relative when repos are siblings; otherwise see `@executioncontrolprotocol/format-reactflow` in the core monorepo).

Summary for demo UI work:

- Flat action nodes; property-level `$ref` edges only
- Hollow vs solid handles; idle cyan routes; ants while running; green when source completed
- Configure + Inspect state; patch write-back keeps Fluent and Flow in sync
- **Opinionated type mapping:** prefer port `valueSchema` (JSON Schema primitives + constraints). Example: `{ type: "string", enum: [...] }` → `<select>`. Fall back to `typeLabel` when no schema. Other apps may map the same encode document differently.
