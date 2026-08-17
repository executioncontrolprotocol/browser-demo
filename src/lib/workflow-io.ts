import type {
  ReactFlowDocument,
  ReactFlowIoData,
  ReactFlowNode,
  ReactFlowPort,
} from "@executioncontrolprotocol/format-reactflow"
import {
  WORKFLOW_ACCEPTS_NODE_ID,
  WORKFLOW_RETURNS_NODE_ID,
} from "@executioncontrolprotocol/format-reactflow"
import type { StepNode, WorkflowManifest, WorkflowNode } from "@executioncontrolprotocol/types"
import { rewriteWorkflowAsRefs } from "./step-configure.js"

/** JSON Schema types offered when adding an I/O parameter. */
export type WorkflowIoSchemaType = "string" | "number" | "boolean" | "object" | "array"

/** Handle id used on an empty Outputs node so the first connection can land. */
export const RETURNS_PLACEHOLDER_HANDLE = "+"

/** Property names for `accepts` / `returns` (same identifier rules as `as`). */
export const WORKFLOW_IO_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** One field in a projected I/O schema editor. */
export interface WorkflowIoField {
  name: string
  type: WorkflowIoSchemaType
  required: boolean
  valueSchema: Record<string, unknown>
}

interface WorkflowContract {
  id: string
  label?: string
  accepts?: Record<string, unknown>
  returns?: Record<string, unknown>
}

function asWorkflowContract(workflow: WorkflowManifest["workflow"]): WorkflowContract {
  return workflow as WorkflowContract
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function schemaType(schema: Record<string, unknown>): WorkflowIoSchemaType {
  const t = schema.type
  if (t === "number" || t === "integer") return "number"
  if (t === "boolean") return "boolean"
  if (t === "object") return "object"
  if (t === "array") return "array"
  return "string"
}

function defaultSchemaForType(type: WorkflowIoSchemaType): Record<string, unknown> {
  if (type === "array") return { type: "array" }
  if (type === "object") return { type: "object" }
  if (type === "number") return { type: "number" }
  if (type === "boolean") return { type: "boolean" }
  return { type: "string" }
}

/**
 * List object-schema properties for configure / run-form UI.
 */
export function ioFieldsFromSchema(
  schema: Record<string, unknown> | undefined
): WorkflowIoField[] {
  if (!schema) return []
  const props = schema.properties
  if (!isRecord(props)) return []
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((k): k is string => typeof k === "string")
      : []
  )
  return Object.entries(props).map(([name, raw]) => {
    const valueSchema = isRecord(raw) ? { ...raw } : {}
    return {
      name,
      type: schemaType(valueSchema),
      required: required.has(name),
      valueSchema,
    }
  })
}

/**
 * Build a JSON Schema object from editor fields. Omits the schema when empty.
 */
export function schemaFromIoFields(
  fields: WorkflowIoField[]
): Record<string, unknown> | undefined {
  if (fields.length === 0) return undefined
  const properties: Record<string, Record<string, unknown>> = {}
  const required: string[] = []
  for (const field of fields) {
    properties[field.name] =
      schemaType(field.valueSchema) === field.type
        ? field.valueSchema
        : defaultSchemaForType(field.type)
    if (field.required) required.push(field.name)
  }
  const schema: Record<string, unknown> = { type: "object", properties }
  if (required.length > 0) schema.required = required
  return schema
}

/** Ports used by the run form (same widgets as step configure). */
export function runFormPortsFromAccepts(
  schema: Record<string, unknown> | undefined
): ReactFlowPort[] {
  return ioFieldsFromSchema(schema).map((field) => ({
    id: field.name,
    name: field.name,
    typeLabel: field.required ? `${field.type}!` : field.type,
    required: field.required,
    valueSchema: field.valueSchema,
  }))
}

function fieldFromConnection(
  name: string,
  valueSchema: Record<string, unknown>,
  required: boolean
): WorkflowIoField {
  return {
    name,
    type: schemaType(valueSchema),
    required,
    valueSchema,
  }
}

/**
 * Add or rename a `returns` property so it matches the source step `.as()`.
 * Copies `valueSchema` from the connected source port when provided.
 */
export function applyReturnsConnection(
  returns: Record<string, unknown> | undefined,
  sourceAs: string,
  targetHandle: string,
  valueSchema?: Record<string, unknown>
): Record<string, unknown> {
  const fields = ioFieldsFromSchema(returns)
  if (!sourceAs.trim()) {
    return schemaFromIoFields(fields) ?? { type: "object", properties: {} }
  }
  const schemaHint = valueSchema && Object.keys(valueSchema).length > 0 ? valueSchema : { type: "object" }
  const placeholder =
    targetHandle === RETURNS_PLACEHOLDER_HANDLE || targetHandle.trim() === ""
  const existingIndex = placeholder ? -1 : fields.findIndex((f) => f.name === targetHandle)

  if (existingIndex >= 0) {
    const current = fields[existingIndex]!
    if (current.name !== sourceAs) {
      if (fields.some((f, i) => i !== existingIndex && f.name === sourceAs)) {
        fields.splice(existingIndex, 1)
        const keep = fields.findIndex((f) => f.name === sourceAs)
        if (keep >= 0) fields[keep] = fieldFromConnection(sourceAs, schemaHint, fields[keep]!.required)
      } else {
        fields[existingIndex] = fieldFromConnection(sourceAs, schemaHint, current.required)
      }
    } else {
      fields[existingIndex] = fieldFromConnection(sourceAs, schemaHint, current.required)
    }
  } else {
    const already = fields.findIndex((f) => f.name === sourceAs)
    if (already >= 0) {
      fields[already] = fieldFromConnection(sourceAs, schemaHint, fields[already]!.required)
    } else {
      fields.push(fieldFromConnection(sourceAs, schemaHint, true))
    }
  }

  return schemaFromIoFields(fields) ?? { type: "object", properties: {} }
}

/** Drop a `returns` property (disconnect from Outputs). */
export function removeReturnsProperty(
  returns: Record<string, unknown> | undefined,
  propertyName: string
): Record<string, unknown> | undefined {
  return schemaFromIoFields(ioFieldsFromSchema(returns).filter((f) => f.name !== propertyName))
}

/** Patch `workflow.accepts` / `workflow.returns`, omitting empty object schemas. */
export function withWorkflowIoSchema(
  manifest: WorkflowManifest,
  kind: "accepts" | "returns",
  schema: Record<string, unknown> | undefined
): WorkflowManifest {
  const workflow: WorkflowContract = { ...asWorkflowContract(manifest.workflow) }
  if (schema) {
    workflow[kind] = schema
  } else {
    delete workflow[kind]
  }
  return { ...manifest, workflow: workflow as WorkflowManifest["workflow"] }
}

function isStepNode(node: WorkflowNode): node is StepNode {
  return !node.type || node.type === "step"
}

/** Rename `.as` on steps that currently commit as `fromName`. */
export function renameMatchingStepAs(
  nodes: WorkflowNode[],
  fromName: string,
  toName: string
): WorkflowNode[] {
  return nodes.map((node) => {
    if (isStepNode(node)) {
      return node.as === fromName ? { ...node, as: toName } : node
    }
    if (node.type === "parallel") {
      return {
        ...node,
        branches: node.branches.map((branch) => renameMatchingStepAs(branch, fromName, toName)),
      }
    }
    if (node.type === "branch") {
      return {
        ...node,
        branches: node.branches.map((arm) => ({
          ...arm,
          steps: renameMatchingStepAs(arm.steps, fromName, toName),
        })),
      }
    }
    return {
      ...node,
      steps: renameMatchingStepAs(node.steps, fromName, toName),
    }
  })
}

/** Rewrite `state.<old>` refs after an accepts property rename. */
export function renameAcceptsProperty(
  manifest: WorkflowManifest,
  fromName: string,
  toName: string
): WorkflowManifest {
  if (fromName === toName) return manifest
  return {
    ...manifest,
    steps: rewriteWorkflowAsRefs(manifest.steps, fromName, toName),
  }
}

/**
 * Rename a `returns` key: matching step `.as` values and `state.<old>` refs stay aligned.
 */
export function renameReturnsProperty(
  manifest: WorkflowManifest,
  fromName: string,
  toName: string
): WorkflowManifest {
  if (fromName === toName || !fromName || !toName) return manifest
  const renamedAs = renameMatchingStepAs(manifest.steps, fromName, toName)
  return {
    ...manifest,
    steps: rewriteWorkflowAsRefs(renamedAs, fromName, toName),
  }
}

/** Patch ops for `ecp.patch` (`workflow.accepts` / `workflow.returns`, never `workflow`). */
export function workflowIoPatchOps(
  previous: WorkflowManifest,
  next: WorkflowManifest
): Array<{ path: string; mode: "replace"; value: unknown }> {
  const ops: Array<{ path: string; mode: "replace"; value: unknown }> = []
  const prev = workflowContract(previous)
  const curr = workflowContract(next)
  if (JSON.stringify(prev.accepts) !== JSON.stringify(curr.accepts)) {
    ops.push({ path: "workflow.accepts", mode: "replace", value: curr.accepts })
  }
  if (JSON.stringify(prev.returns) !== JSON.stringify(curr.returns)) {
    ops.push({ path: "workflow.returns", mode: "replace", value: curr.returns })
  }
  if (JSON.stringify(next.steps) !== JSON.stringify(previous.steps)) {
    ops.push({ path: "steps", mode: "replace", value: next.steps })
  }
  return ops
}

const RETURNS_PLACEHOLDER_PORT: ReactFlowPort = {
  id: RETURNS_PLACEHOLDER_HANDLE,
  name: "add",
  typeLabel: "unknown",
}

function emptyReturnsNode(position: { x: number; y: number }): ReactFlowNode {
  const data: ReactFlowIoData = {
    label: "Outputs",
    kind: "returns",
    inputs: [RETURNS_PLACEHOLDER_PORT],
    outputs: [],
  }
  return {
    id: WORKFLOW_RETURNS_NODE_ID,
    type: "ecp-io",
    position,
    data,
  }
}

function withReturnsPlaceholder(doc: ReactFlowDocument): ReactFlowDocument {
  return {
    ...doc,
    nodes: doc.nodes.map((node) => {
      if (node.id !== WORKFLOW_RETURNS_NODE_ID || node.type !== "ecp-io") return node
      const data = node.data as ReactFlowIoData
      const inputs = data.inputs ?? []
      if (inputs.some((port) => port.id === RETURNS_PLACEHOLDER_HANDLE)) return node
      return {
        ...node,
        data: {
          ...data,
          inputs: [...inputs, RETURNS_PLACEHOLDER_PORT],
        },
      }
    }),
  }
}

/**
 * Demo always shows an Outputs node so `returns` can be added by connecting.
 * Encode omits it when `returns` is empty. A `+` handle is demo-only (not in the schema).
 */
export function ensureReturnsNode(doc: ReactFlowDocument): ReactFlowDocument {
  if (doc.nodes.some((n) => n.id === WORKFLOW_RETURNS_NODE_ID)) {
    return withReturnsPlaceholder(doc)
  }
  const maxX = doc.nodes.reduce((m, n) => Math.max(m, n.position.x), 0)
  const y =
    doc.nodes.find((n) => n.id === WORKFLOW_ACCEPTS_NODE_ID)?.position.y ??
    doc.nodes[0]?.position.y ??
    0
  return withReturnsPlaceholder({
    ...doc,
    nodes: [...doc.nodes, emptyReturnsNode({ x: maxX + 280, y })],
  })
}

export { WORKFLOW_ACCEPTS_NODE_ID, WORKFLOW_RETURNS_NODE_ID }

/** Read workflow I/O schemas (present on current spec; optional on older types). */
export function workflowContract(manifest: WorkflowManifest): {
  accepts?: Record<string, unknown>
  returns?: Record<string, unknown>
} {
  const workflow = asWorkflowContract(manifest.workflow)
  return { accepts: workflow.accepts, returns: workflow.returns }
}
