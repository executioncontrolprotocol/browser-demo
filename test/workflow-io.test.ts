import { describe, expect, it } from "vitest"
import type { ReactFlowDocument } from "@executioncontrolprotocol/format-reactflow"
import {
  RETURNS_PLACEHOLDER_HANDLE,
  WORKFLOW_RETURNS_NODE_ID,
  applyReturnsConnection,
  ensureReturnsNode,
  ioFieldsFromSchema,
  renameReturnsProperty,
  removeReturnsProperty,
  schemaFromIoFields,
  withWorkflowIoSchema,
  workflowIoPatchOps,
} from "../src/lib/workflow-io.js"
import type { WorkflowManifest } from "@executioncontrolprotocol/types"

function manifest(): WorkflowManifest {
  return {
    schema: "@executioncontrolprotocol.workflow",
    version: "1.0",
    workflow: { id: "w", label: "W" },
    steps: [],
  }
}

describe("workflow-io helpers", () => {
  it("omits empty schemas and lists required fields", () => {
    expect(schemaFromIoFields([])).toBeUndefined()
    const schema = schemaFromIoFields([
      { name: "prompt", type: "string", required: true, valueSchema: { type: "string" } },
      { name: "n", type: "number", required: false, valueSchema: { type: "number" } },
    ])
    expect(schema).toEqual({
      type: "object",
      properties: { prompt: { type: "string" }, n: { type: "number" } },
      required: ["prompt"],
    })
    expect(ioFieldsFromSchema(schema).map((f) => f.name)).toEqual(["prompt", "n"])
  })

  it("renames a returns property to the source as key", () => {
    const returns = schemaFromIoFields([
      { name: "out", type: "object", required: true, valueSchema: { type: "object" } },
    ])
    const next = applyReturnsConnection(returns, "brief", "out")
    expect(Object.keys((next.properties as object) ?? {})).toEqual(["brief"])
  })

  it("replaces an occupied returns handle and drops the previous key", () => {
    const returns = applyReturnsConnection(undefined, "echo", RETURNS_PLACEHOLDER_HANDLE)
    const next = applyReturnsConnection(returns, "brief", "echo")
    expect(Object.keys(next.properties as object)).toEqual(["brief"])
    expect((next.properties as Record<string, unknown>).echo).toBeUndefined()
  })

  it("adds a new returns key when dropping on the placeholder", () => {
    const returns = applyReturnsConnection(undefined, "echo", RETURNS_PLACEHOLDER_HANDLE)
    const next = applyReturnsConnection(returns, "brief", RETURNS_PLACEHOLDER_HANDLE)
    expect(Object.keys(next.properties as object).sort()).toEqual(["brief", "echo"])
  })

  it("adds a returns property from the placeholder handle", () => {
    const next = applyReturnsConnection(undefined, "brief", RETURNS_PLACEHOLDER_HANDLE)
    expect(next).toMatchObject({
      type: "object",
      properties: { brief: { type: "object" } },
    })
  })

  it("copies source valueSchema onto a new returns property", () => {
    const next = applyReturnsConnection(
      undefined,
      "echo",
      RETURNS_PLACEHOLDER_HANDLE,
      { type: "string" }
    )
    expect(next.properties).toEqual({ echo: { type: "string" } })
  })

  it("updates type when reconnecting an existing returns key", () => {
    const returns = applyReturnsConnection(undefined, "echo", RETURNS_PLACEHOLDER_HANDLE, {
      type: "object",
    })
    const next = applyReturnsConnection(returns, "echo", RETURNS_PLACEHOLDER_HANDLE, {
      type: "string",
    })
    expect(next.properties).toEqual({ echo: { type: "string" } })
  })

  it("drops the old returns handle when renaming onto an existing as key", () => {
    const returns = schemaFromIoFields([
      { name: "out", type: "object", required: true, valueSchema: { type: "object" } },
      { name: "brief", type: "object", required: true, valueSchema: { type: "object" } },
    ])
    const next = applyReturnsConnection(returns, "brief", "out")
    expect(Object.keys(next.properties as object)).toEqual(["brief"])
  })

  it("ignores an empty source as key", () => {
    expect(applyReturnsConnection(undefined, "", RETURNS_PLACEHOLDER_HANDLE)).toEqual({
      type: "object",
      properties: {},
    })
    const existing = applyReturnsConnection(undefined, "echo", RETURNS_PLACEHOLDER_HANDLE)
    expect(applyReturnsConnection(existing, "  ", RETURNS_PLACEHOLDER_HANDLE)).toEqual(existing)
  })

  it("removes a returns property", () => {
    const returns = applyReturnsConnection(undefined, "brief", RETURNS_PLACEHOLDER_HANDLE)
    expect(removeReturnsProperty(returns, "brief")).toBeUndefined()
  })

  it("ignores disconnect of an unknown returns handle", () => {
    const returns = applyReturnsConnection(undefined, "brief", RETURNS_PLACEHOLDER_HANDLE)
    expect(removeReturnsProperty(returns, "missing")).toEqual(returns)
  })

  it("patches workflow.accepts onto the manifest", () => {
    const schema = { type: "object", properties: { q: { type: "string" } }, required: ["q"] }
    const next = withWorkflowIoSchema(manifest(), "accepts", schema)
    expect(
      (next.workflow as WorkflowManifest["workflow"] & { accepts?: unknown }).accepts
    ).toEqual(schema)
    const cleared = withWorkflowIoSchema(next, "accepts", undefined)
    expect(
      (cleared.workflow as WorkflowManifest["workflow"] & { accepts?: unknown }).accepts
    ).toBeUndefined()
  })

  it("emits workflow.accepts / workflow.returns patch paths, never workflow", () => {
    const schema = { type: "object", properties: { q: { type: "string" } }, required: ["q"] }
    const next = withWorkflowIoSchema(manifest(), "accepts", schema)
    const ops = workflowIoPatchOps(manifest(), next)
    expect(ops.map((op) => op.path)).toEqual(["workflow.accepts"])
    expect(ops[0]?.mode).toBe("replace")
    expect(workflowIoPatchOps(next, next)).toEqual([])
  })

  it("injects an empty Outputs node when encode omitted it", () => {
    const doc: ReactFlowDocument = {
      nodes: [
        {
          id: "ecp:accepts",
          type: "ecp-io",
          position: { x: 0, y: 10 },
          data: { label: "Inputs", kind: "accepts", inputs: [], outputs: [] },
        },
      ],
      edges: [],
    }
    const withOut = ensureReturnsNode(doc)
    expect(withOut.nodes.some((n) => n.id === WORKFLOW_RETURNS_NODE_ID)).toBe(true)
    expect(ensureReturnsNode(withOut).nodes.filter((n) => n.id === WORKFLOW_RETURNS_NODE_ID)).toHaveLength(
      1
    )
  })

  it("keeps a placeholder handle on an Outputs node that already has returns ports", () => {
    const doc: ReactFlowDocument = {
      nodes: [
        {
          id: WORKFLOW_RETURNS_NODE_ID,
          type: "ecp-io",
          position: { x: 200, y: 10 },
          data: {
            label: "Outputs",
            kind: "returns",
            inputs: [{ id: "echo", name: "echo", typeLabel: "object" }],
            outputs: [],
          },
        },
      ],
      edges: [],
    }
    const next = ensureReturnsNode(doc)
    const io = next.nodes.find((n) => n.id === WORKFLOW_RETURNS_NODE_ID)
    const inputs = (io?.data as { inputs: Array<{ id: string }> }).inputs
    expect(inputs.map((p) => p.id)).toEqual(["echo", RETURNS_PLACEHOLDER_HANDLE])
    expect(ensureReturnsNode(next).nodes.filter((n) => n.id === WORKFLOW_RETURNS_NODE_ID)).toHaveLength(1)
  })

  it("renames matching step as and state refs when a returns key is renamed", () => {
    const base: WorkflowManifest = {
      schema: "@executioncontrolprotocol.workflow",
      version: "1.0",
      workflow: { id: "w" },
      steps: [
        {
          type: "step",
          id: "echo",
          uses: "@executioncontrolprotocol/test.echo",
          as: "echo",
        },
        {
          type: "step",
          id: "next",
          uses: "@executioncontrolprotocol/test.echo",
          input: { value: { $ref: "state.echo" } },
          as: "out",
        },
      ],
    }
    const next = renameReturnsProperty(base, "echo", "brief")
    expect(next.steps[0]).toMatchObject({ as: "brief" })
    expect(next.steps[1]?.input).toEqual({ value: { $ref: "state.brief" } })
  })

  it("does not rewrite as when returns rename is a no-op", () => {
    const base: WorkflowManifest = {
      schema: "@executioncontrolprotocol.workflow",
      version: "1.0",
      workflow: { id: "w" },
      steps: [{ type: "step", id: "echo", uses: "@executioncontrolprotocol/test.echo", as: "echo" }],
    }
    expect(renameReturnsProperty(base, "echo", "echo").steps[0]).toMatchObject({ as: "echo" })
    expect(renameReturnsProperty(base, "echo", "").steps[0]).toMatchObject({ as: "echo" })
  })
})
