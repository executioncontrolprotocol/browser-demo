import { describe, expect, it } from "vitest"
import type { ReactFlowDocument } from "@executioncontrolprotocol/format-reactflow"
import {
  RETURNS_PLACEHOLDER_HANDLE,
  WORKFLOW_RETURNS_NODE_ID,
  applyReturnsConnection,
  ensureReturnsNode,
  ioFieldsFromSchema,
  removeReturnsProperty,
  schemaFromIoFields,
  withWorkflowIoSchema,
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

  it("adds a returns property from the placeholder handle", () => {
    const next = applyReturnsConnection(undefined, "brief", RETURNS_PLACEHOLDER_HANDLE)
    expect(next).toMatchObject({
      type: "object",
      properties: { brief: { type: "object" } },
    })
  })

  it("drops the old returns handle when renaming onto an existing as key", () => {
    const returns = schemaFromIoFields([
      { name: "out", type: "object", required: true, valueSchema: { type: "object" } },
      { name: "brief", type: "object", required: true, valueSchema: { type: "object" } },
    ])
    const next = applyReturnsConnection(returns, "brief", "out")
    expect(Object.keys(next.properties as object)).toEqual(["brief"])
  })

  it("removes a returns property", () => {
    const returns = applyReturnsConnection(undefined, "brief", RETURNS_PLACEHOLDER_HANDLE)
    expect(removeReturnsProperty(returns, "brief")).toBeUndefined()
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
})
