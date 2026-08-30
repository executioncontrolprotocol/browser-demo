import { describe, expect, it } from "vitest"
import type { ReactFlowDocument } from "@executioncontrolprotocol/format-reactflow"
import {
  ACCEPTS_PLACEHOLDER_HANDLE,
  RETURNS_PLACEHOLDER_HANDLE,
  WORKFLOW_ACCEPTS_NODE_ID,
  WORKFLOW_RETURNS_NODE_ID,
  applyAcceptsConnection,
  applyReturnsConnection,
  ensureAcceptsPlaceholder,
  ensureReturnsNode,
  ioFieldsFromSchema,
  portFromIoField,
  renameReturnsProperty,
  removeReturnsProperty,
  runFormPortsFromAccepts,
  schemaFromIoFields,
  withWorkflowIoSchema,
  workflowIoPatchOps,
} from "../src/lib/workflow-io.js"
import { applyPortConnection } from "../src/lib/step-connect.js"
import { editorKindForPort } from "../src/lib/step-configure.js"
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

  it("uses dot-path property names for sub-field returns connections", () => {
    const metadataSchema = {
      type: "object",
      properties: { aspectRatio: { type: "number" } },
    }
    const next = applyReturnsConnection(
      undefined,
      "inspected",
      RETURNS_PLACEHOLDER_HANDLE,
      metadataSchema,
      "metadata"
    )
    expect(Object.keys(next.properties as object)).toEqual(["inspected.metadata"])
    expect((next.properties as Record<string, unknown>)["inspected.metadata"]).toEqual(metadataSchema)
  })

  it("uses step as key for whole-step returns connections", () => {
    const next = applyReturnsConnection(undefined, "inspected", RETURNS_PLACEHOLDER_HANDLE, undefined, "output")
    expect(Object.keys(next.properties as object)).toEqual(["inspected"])
    expect(applyReturnsConnection(undefined, "inspected", RETURNS_PLACEHOLDER_HANDLE)).toMatchObject({
      properties: { inspected: { type: "object" } },
    })
  })

  it("replaces whole-step returns key when connecting a sub-field", () => {
    const whole = applyReturnsConnection(undefined, "inspected", RETURNS_PLACEHOLDER_HANDLE, undefined, "output")
    const next = applyReturnsConnection(
      whole,
      "inspected",
      "inspected",
      { type: "object", properties: { aspectRatio: { type: "number" } } },
      "metadata"
    )
    expect(Object.keys(next.properties as object)).toEqual(["inspected.metadata"])
    expect((next.properties as Record<string, unknown>).inspected).toBeUndefined()
  })

  it("replaces dot-path returns key when reconnecting whole-step output", () => {
    const dotted = applyReturnsConnection(
      undefined,
      "inspected",
      RETURNS_PLACEHOLDER_HANDLE,
      { type: "object" },
      "metadata"
    )
    const next = applyReturnsConnection(dotted, "inspected", "inspected.metadata", undefined, "output")
    expect(Object.keys(next.properties as object)).toEqual(["inspected"])
    expect((next.properties as Record<string, unknown>)["inspected.metadata"]).toBeUndefined()
  })

  it("renames dot-path returns keys when step as changes", () => {
    const base: WorkflowManifest = {
      schema: "@executioncontrolprotocol.workflow",
      version: "1.0",
      workflow: {
        id: "w",
        returns: {
          type: "object",
          properties: {
            "inspected.metadata": { type: "object" },
          },
          required: ["inspected.metadata"],
        },
      },
      steps: [{ type: "step", id: "inspect", uses: "@executioncontrolprotocol/test.echo", as: "inspected" }],
    }
    const next = renameReturnsProperty(base, "inspected", "reviewed")
    expect(next.steps[0]).toMatchObject({ as: "reviewed" })
    expect(Object.keys((next.workflow as { returns?: { properties?: object } }).returns?.properties ?? {})).toEqual([
      "reviewed.metadata",
    ])
  })
})

describe("returns sub-field wiring round-trip", () => {
  it("persists dot-path returns, re-encodes metadata edge, and picks nested output", async () => {
    const { workflowToReactFlow, WORKFLOW_RETURNS_NODE_ID } = await import(
      "@executioncontrolprotocol/format-reactflow"
    )
    const { pickWorkflowReturns, globalRegistry, defineExtension, capabilityFor } = await import(
      "@executioncontrolprotocol/core"
    )
    const { z } = await import("zod")

    const multiOutExtension = defineExtension("@executioncontrolprotocol", "multi-out-fixture")
      .withConfig({})
      .withCapabilities([
        capabilityFor("@executioncontrolprotocol/multi-out-fixture", "inspect")
          .withInput(z.object({}))
          .withOutput(
            z.object({
              image: z.object({ locator: z.string() }),
              metadata: z.object({ aspectRatio: z.number() }),
            })
          )
          .withExecution("local")
          .withHandler(async () => ({
            image: { locator: "ecp://browser/x" },
            metadata: { aspectRatio: 1.5 },
          })),
      ])
      .build()

    if (!globalRegistry.getExtension("@executioncontrolprotocol/multi-out-fixture")) {
      await globalRegistry.registerExtension(multiOutExtension)
    }

    const metadataSchema = {
      type: "object",
      properties: { aspectRatio: { type: "number" } },
    }
    const base: WorkflowManifest = {
      schema: "@executioncontrolprotocol.workflow",
      version: "1.0",
      workflow: { id: "sharp" },
      steps: [
        {
          type: "step",
          id: "inspect",
          uses: "@executioncontrolprotocol/multi-out-fixture.inspect",
          as: "inspected",
        },
      ],
    }
    const returns = applyReturnsConnection(
      undefined,
      "inspected",
      RETURNS_PLACEHOLDER_HANDLE,
      metadataSchema,
      "metadata"
    )
    const manifest = withWorkflowIoSchema(base, "returns", returns)
    const doc = workflowToReactFlow(manifest, globalRegistry)
    const edge = doc.edges.find((item) => item.target === WORKFLOW_RETURNS_NODE_ID)
    expect(edge?.source).toBe("inspect")
    expect(edge?.sourceHandle).toBe("metadata")
    expect(edge?.targetHandle).toBe("inspected.metadata")

    const state = {
      inspected: {
        image: { locator: "ecp://browser/x" },
        metadata: { aspectRatio: 1.5, orientation: "landscape" },
      },
    }
    expect(pickWorkflowReturns(manifest.workflow.returns as Record<string, unknown>, state)).toEqual({
      "inspected.metadata": { aspectRatio: 1.5, orientation: "landscape" },
    })
  })
})

describe("applyAcceptsConnection", () => {
  it("adds a property from the placeholder using the target param name", () => {
    const next = applyAcceptsConnection(
      undefined,
      ACCEPTS_PLACEHOLDER_HANDLE,
      "prompt",
      { type: "string" }
    )
    expect(next).toMatchObject({
      type: "object",
      properties: { prompt: { type: "string" } },
      required: ["prompt"],
    })
  })

  it("updates an existing accepts key with richer valueSchema", () => {
    const accepts = applyAcceptsConnection(
      undefined,
      ACCEPTS_PLACEHOLDER_HANDLE,
      "mode",
      { type: "string" }
    )
    const next = applyAcceptsConnection(accepts, "mode", "mode", {
      type: "string",
      enum: ["fast", "slow"],
    })
    expect(next.properties).toEqual({
      mode: { type: "string", enum: ["fast", "slow"] },
    })
  })

  it("copies boolean and enum schemas", () => {
    const boolSchema = applyAcceptsConnection(
      undefined,
      ACCEPTS_PLACEHOLDER_HANDLE,
      "enabled",
      { type: "boolean" },
      true
    )
    expect(ioFieldsFromSchema(boolSchema)[0]).toMatchObject({
      name: "enabled",
      type: "boolean",
      required: true,
    })

    const enumSchema = applyAcceptsConnection(
      undefined,
      ACCEPTS_PLACEHOLDER_HANDLE,
      "mode",
      { type: "string", enum: ["a", "b"] },
      false
    )
    expect(enumSchema.required).toBeUndefined()
    expect(ioFieldsFromSchema(enumSchema)[0]?.valueSchema).toEqual({
      type: "string",
      enum: ["a", "b"],
    })
  })

  it("preserves required when updating schema without required arg", () => {
    const accepts = applyAcceptsConnection(
      undefined,
      ACCEPTS_PLACEHOLDER_HANDLE,
      "prompt",
      { type: "string" },
      false
    )
    const next = applyAcceptsConnection(accepts, "prompt", "prompt", {
      type: "string",
      minLength: 3,
    })
    expect(next.required).toBeUndefined()
    expect((next.properties as Record<string, unknown>).prompt).toEqual({
      type: "string",
      minLength: 3,
    })
  })

  it("ignores empty property name", () => {
    expect(
      applyAcceptsConnection(undefined, ACCEPTS_PLACEHOLDER_HANDLE, "  ", { type: "string" })
    ).toEqual({
      type: "object",
      properties: {},
    })
  })

  it("maps portFromIoField for run-form widgets", () => {
    const field = {
      name: "mode",
      type: "string" as const,
      required: true,
      valueSchema: { type: "string", enum: ["fast", "slow"] },
    }
    const port = portFromIoField(field)
    expect(port.typeLabel).toBe("string!")
    expect(editorKindForPort(port)).toBe("enum-radio")
  })

  it("appends placeholder handle to accepts outputs once", () => {
    const doc: ReactFlowDocument = {
      nodes: [
        {
          id: WORKFLOW_ACCEPTS_NODE_ID,
          type: "ecp-io",
          position: { x: 0, y: 0 },
          data: {
            label: "Inputs",
            kind: "accepts",
            inputs: [],
            outputs: [{ id: "prompt", name: "prompt", typeLabel: "string!" }],
          },
        },
      ],
      edges: [],
    }
    const next = ensureAcceptsPlaceholder(doc)
    const io = next.nodes.find((n) => n.id === WORKFLOW_ACCEPTS_NODE_ID)
    const outputs = (io?.data as { outputs: Array<{ id: string }> }).outputs
    expect(outputs.map((p) => p.id)).toEqual(["prompt", ACCEPTS_PLACEHOLDER_HANDLE])
    expect(ensureAcceptsPlaceholder(next)).toEqual(next)
  })

  it("round-trips accepts wiring into run-form port kinds", () => {
    const accepts = applyAcceptsConnection(
      undefined,
      ACCEPTS_PLACEHOLDER_HANDLE,
      "enabled",
      { type: "boolean" },
      true
    )
    const manifestWithAccepts = withWorkflowIoSchema(manifest(), "accepts", accepts)
    const step = applyPortConnection(
      { id: "s1", uses: "@x/y", input: {} },
      "enabled",
      "state.enabled"
    )
    const ports = runFormPortsFromAccepts(
      (manifestWithAccepts.workflow as { accepts?: Record<string, unknown> }).accepts
    )
    expect(ports).toHaveLength(1)
    expect(editorKindForPort(ports[0]!)).toBe("boolean")
    expect(step.input).toEqual({ enabled: { $ref: "state.enabled" } })
  })
})
