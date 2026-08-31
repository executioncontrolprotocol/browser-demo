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
import { OUTPUT_HANDLE_ID } from "./step-connect.js"
import { WORKFLOW_FILE_VALUE_SCHEMA } from "./run-form-files.js"

/** JSON Schema types offered when adding an I/O parameter. */
export type WorkflowIoSchemaType = "string" | "number" | "boolean" | "object" | "array" | "file"

/** Handle id used on an empty Outputs node so the first connection can land. */
export const RETURNS_PLACEHOLDER_HANDLE = "+"

/** Handle id on Inputs outputs for connect-to-add (same id as returns placeholder). */
export const ACCEPTS_PLACEHOLDER_HANDLE = RETURNS_PLACEHOLDER_HANDLE

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

/** Preset keys for workflow file `contentMediaType` hints. */
export type WorkflowFileMediaPreset = "any" | "image/*" | "image/png" | "application/pdf" | "text/plain" | "custom"

/** Preset options shown when configuring file I/O fields. */
export const WORKFLOW_FILE_MEDIA_PRESETS: Array<{
  id: WorkflowFileMediaPreset
  label: string
  contentMediaType?: string
}> = [
  { id: "any", label: "Any file" },
  { id: "image/*", label: "Images (image/*)", contentMediaType: "image/*" },
  { id: "image/png", label: "PNG (image/png)", contentMediaType: "image/png" },
  { id: "application/pdf", label: "PDF (application/pdf)", contentMediaType: "application/pdf" },
  { id: "text/plain", label: "Text (text/plain)", contentMediaType: "text/plain" },
  { id: "custom", label: "Custom…" },
]

/** Read preset id + optional custom MIME from a file field schema. */
export function fileMediaPresetFromSchema(
  schema: Record<string, unknown>
): { preset: WorkflowFileMediaPreset; custom?: string } {
  const raw = schema.contentMediaType
  if (typeof raw !== "string" || raw.length === 0) {
    return { preset: "any" }
  }
  const match = WORKFLOW_FILE_MEDIA_PRESETS.find((p) => p.contentMediaType === raw)
  if (match && match.id !== "custom") {
    return { preset: match.id }
  }
  return { preset: "custom", custom: raw }
}

/** Apply a preset (or custom MIME) onto a file value schema clone. */
export function fileSchemaWithMediaPreset(
  schema: Record<string, unknown>,
  preset: WorkflowFileMediaPreset,
  custom?: string
): Record<string, unknown> {
  const next = { ...schema }
  if (preset === "any") {
    delete next.contentMediaType
    return next
  }
  if (preset === "custom") {
    const trimmed = custom?.trim()
    if (trimmed) next.contentMediaType = trimmed
    else delete next.contentMediaType
    return next
  }
  const entry = WORKFLOW_FILE_MEDIA_PRESETS.find((p) => p.id === preset)
  if (entry?.contentMediaType) {
    next.contentMediaType = entry.contentMediaType
  }
  return next
}

function schemaType(schema: Record<string, unknown>): WorkflowIoSchemaType {
  if (schema["x-ecp-file"] === true) return "file"
  if (typeof schema.contentMediaType === "string" && schema.contentMediaType.length > 0) {
    return "file"
  }
  if (Array.isArray(schema.contentMediaType) && schema.contentMediaType.length > 0) {
    return "file"
  }
  if (schema.format === "binary" || schema.format === "byte") return "file"
  const t = schema.type
  if (t === "number" || t === "integer") return "number"
  if (t === "boolean") return "boolean"
  if (t === "object") return "object"
  if (t === "array") return "array"
  return "string"
}

/** Default JSON Schema fragment for a coarse I/O type picker. */
export function defaultSchemaForType(type: WorkflowIoSchemaType): Record<string, unknown> {
  if (type === "file") return { ...WORKFLOW_FILE_VALUE_SCHEMA }
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
    const type = schemaType(valueSchema)
    // Legacy string file fields → ImageRef file-ref schema (locator path, no base64).
    const normalizedSchema =
      type === "file" && valueSchema.type === "string"
        ? { ...WORKFLOW_FILE_VALUE_SCHEMA }
        : valueSchema
    return {
      name,
      type,
      required: required.has(name),
      valueSchema: normalizedSchema,
    }
  })
}

/**
 * Upgrade legacy string `file` accepts properties to ImageRef file-ref schemas for run validation.
 */
export function withNormalizedFileAccepts(manifest: WorkflowManifest): WorkflowManifest {
  const accepts = asWorkflowContract(manifest.workflow).accepts
  if (!accepts || !isRecord(accepts.properties)) return manifest
  const properties: Record<string, unknown> = { ...accepts.properties }
  let changed = false
  for (const [name, raw] of Object.entries(properties)) {
    if (!isRecord(raw)) continue
    if (schemaType(raw) === "file" && raw.type === "string") {
      properties[name] = { ...WORKFLOW_FILE_VALUE_SCHEMA }
      changed = true
    }
  }
  if (!changed) return manifest
  return {
    ...manifest,
    workflow: {
      ...manifest.workflow,
      accepts: { ...accepts, properties },
    },
  }
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

/** Map an I/O editor field to a React Flow port (shared by run form and configure). */
export function portFromIoField(field: WorkflowIoField): ReactFlowPort {
  return {
    id: field.name,
    name: field.name,
    typeLabel: field.required ? `${field.type}!` : field.type,
    required: field.required,
    valueSchema: field.valueSchema,
  }
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

function returnsPropertyName(sourceAs: string, sourceHandle?: string): string {
  const handle = sourceHandle?.trim()
  if (!handle || handle === OUTPUT_HANDLE_ID) return sourceAs
  return `${sourceAs}.${handle}`
}

/**
 * Add or update a `returns` property from a step connection.
 * Dot-path property names encode sub-field wiring (e.g. `inspected.metadata`).
 * Copies `valueSchema` from the connected source port when provided.
 */
export function applyReturnsConnection(
  returns: Record<string, unknown> | undefined,
  sourceAs: string,
  targetHandle: string,
  valueSchema?: Record<string, unknown>,
  sourceHandle?: string
): Record<string, unknown> {
  const fields = ioFieldsFromSchema(returns)
  if (!sourceAs.trim()) {
    return schemaFromIoFields(fields) ?? { type: "object", properties: {} }
  }
  const propertyName = returnsPropertyName(sourceAs, sourceHandle)
  const schemaHint = valueSchema && Object.keys(valueSchema).length > 0 ? valueSchema : { type: "object" }
  const placeholder =
    targetHandle === RETURNS_PLACEHOLDER_HANDLE || targetHandle.trim() === ""

  const keysToRemove = new Set<string>()
  if (!placeholder) {
    keysToRemove.add(targetHandle)
    if (propertyName.includes(".")) {
      keysToRemove.add(sourceAs)
    }
    if (propertyName === sourceAs) {
      for (const field of fields) {
        if (field.name.startsWith(`${sourceAs}.`)) keysToRemove.add(field.name)
      }
    }
  }

  const nextFields = fields.filter((field) => !keysToRemove.has(field.name))
  const existingIndex = nextFields.findIndex((field) => field.name === propertyName)
  if (existingIndex >= 0) {
    nextFields[existingIndex] = fieldFromConnection(
      propertyName,
      schemaHint,
      nextFields[existingIndex]!.required
    )
  } else {
    nextFields.push(fieldFromConnection(propertyName, schemaHint, true))
  }

  return schemaFromIoFields(nextFields) ?? { type: "object", properties: {} }
}

function acceptsPropertyName(sourceHandle: string, targetHandle: string): string {
  const handle = sourceHandle.trim()
  if (!handle || handle === ACCEPTS_PLACEHOLDER_HANDLE) {
    return targetHandle.trim()
  }
  return handle
}

/**
 * Add or update an `accepts` property from an Inputs→step connection.
 * Copies `valueSchema` from the target step input port when provided.
 */
export function applyAcceptsConnection(
  accepts: Record<string, unknown> | undefined,
  sourceHandle: string,
  targetHandle: string,
  valueSchema?: Record<string, unknown>,
  required?: boolean
): Record<string, unknown> {
  const fields = ioFieldsFromSchema(accepts)
  const propertyName = acceptsPropertyName(sourceHandle, targetHandle)
  if (!propertyName) {
    return schemaFromIoFields(fields) ?? { type: "object", properties: {} }
  }

  const schemaHint =
    valueSchema && Object.keys(valueSchema).length > 0 ? valueSchema : { type: "string" }
  const existingIndex = fields.findIndex((field) => field.name === propertyName)
  const requiredFlag =
    required !== undefined
      ? required
      : existingIndex >= 0
        ? fields[existingIndex]!.required
        : true

  const nextField = fieldFromConnection(propertyName, schemaHint, requiredFlag)
  if (existingIndex >= 0) {
    fields[existingIndex] = nextField
  } else {
    fields.push(nextField)
  }

  return schemaFromIoFields(fields) ?? { type: "object", properties: {} }
}

/** Drop an `accepts` property. */
export function removeAcceptsProperty(
  accepts: Record<string, unknown> | undefined,
  propertyName: string
): Record<string, unknown> | undefined {
  return schemaFromIoFields(ioFieldsFromSchema(accepts).filter((f) => f.name !== propertyName))
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
  let next: WorkflowManifest = {
    ...manifest,
    steps: rewriteWorkflowAsRefs(renamedAs, fromName, toName),
  }
  const returns = asWorkflowContract(manifest.workflow).returns
  if (returns) {
    const renamedFields = ioFieldsFromSchema(returns).map((field) => {
      if (field.name === fromName) return { ...field, name: toName }
      if (field.name.startsWith(`${fromName}.`)) {
        return { ...field, name: `${toName}${field.name.slice(fromName.length)}` }
      }
      return field
    })
    next = withWorkflowIoSchema(next, "returns", schemaFromIoFields(renamedFields))
  }
  return next
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

const IO_PLACEHOLDER_PORT: ReactFlowPort = {
  id: RETURNS_PLACEHOLDER_HANDLE,
  name: "add",
  typeLabel: "unknown",
}

const RETURNS_PLACEHOLDER_PORT = IO_PLACEHOLDER_PORT

const ACCEPTS_PLACEHOLDER_PORT: ReactFlowPort = {
  id: ACCEPTS_PLACEHOLDER_HANDLE,
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
function withAcceptsPlaceholder(doc: ReactFlowDocument): ReactFlowDocument {
  return {
    ...doc,
    nodes: doc.nodes.map((node) => {
      if (node.id !== WORKFLOW_ACCEPTS_NODE_ID || node.type !== "ecp-io") return node
      const data = node.data as ReactFlowIoData
      const outputs = data.outputs ?? []
      if (outputs.some((port) => port.id === ACCEPTS_PLACEHOLDER_HANDLE)) return node
      return {
        ...node,
        data: {
          ...data,
          outputs: [...outputs, ACCEPTS_PLACEHOLDER_PORT],
        },
      }
    }),
  }
}

/**
 * Demo always shows a connect-to-add handle on Inputs outputs.
 * Encode omits it; the `+` handle is demo-only (not in the schema).
 */
export function ensureAcceptsPlaceholder(doc: ReactFlowDocument): ReactFlowDocument {
  return withAcceptsPlaceholder(doc)
}

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
