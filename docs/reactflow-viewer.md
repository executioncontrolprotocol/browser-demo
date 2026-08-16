# React Flow viewer

The browser demo Flow panel follows the shared React Flow render contract documented in the core package:

[`REACTFLOW_RENDER.md`](../../executioncontrolprotocol/packages/extensions/format-reactflow/REACTFLOW_RENDER.md)

(path relative when repos are siblings; otherwise see `@executioncontrolprotocol/format-reactflow` in the core monorepo).

Summary for demo UI work:

- Flat action nodes; property-level `$ref` edges only
- Hollow vs solid handles; idle cyan routes; ants while running; green when source completed
- Configure + Inspect state; patch write-back keeps Fluent and Flow in sync
