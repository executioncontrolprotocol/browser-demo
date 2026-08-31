import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import {
  defaultSchemaForType,
  portFromIoField,
  type WorkflowIoField,
  type WorkflowIoSchemaType,
} from "./workflow-io.js"
import {
  defaultDraftForKind,
  draftForPort,
  editorKindForPort,
  optionsForPort,
  parseEditedLiteral,
} from "./step-configure.js"

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function hasConnectionConstraints(schema: Record<string, unknown>): boolean {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return true
  if (schema["x-ecp-file"] === true) return true
  if (typeof schema.contentMediaType === "string" && schema.contentMediaType.length > 0) return true
  if (schema.minLength !== undefined || schema.maxLength !== undefined) return true
  if (schema.minimum !== undefined || schema.maximum !== undefined) return true
  if (schema.type === "array" && isRecord(schema.items) && Array.isArray(schema.items.enum)) {
    return true
  }
  return false
}

/**
 * Merge a coarse type change onto an existing valueSchema without dropping wired constraints.
 */
export function mergeIoFieldValueSchemaOnTypeChange(
  current: Record<string, unknown>,
  nextType: WorkflowIoSchemaType
): Record<string, unknown> {
  const base = defaultSchemaForType(nextType)
  if (!hasConnectionConstraints(current)) {
    return base
  }
  const merged = { ...current, ...base }
  if (nextType === "file") {
    return { ...base, ...current, type: undefined }
  }
  return merged
}

/** Draft string for an accepts configure row (from schema default or editor kind). */
export function draftForIoField(field: WorkflowIoField): string {
  const port = portFromIoField(field)
  const schemaDefault = field.valueSchema.default
  if (schemaDefault !== undefined) {
    return draftForPort(port, schemaDefault)
  }
  const kind = editorKindForPort(port)
  return defaultDraftForKind(kind, optionsForPort(port))
}

export type IoConfigureRowValidationResult =
  | { ok: true; fields: WorkflowIoField[] }
  | { ok: false; error: string; fieldName?: string }

/**
 * Validate accepts configure drafts and write optional `default` values into each field schema.
 */
export function buildIoFieldsFromConfigureRows(
  rows: WorkflowIoField[],
  drafts: Record<string, string>,
  kind: "accepts" | "returns"
): IoConfigureRowValidationResult {
  const nextFields: WorkflowIoField[] = []

  for (const row of rows) {
    const port: ReactFlowPort = portFromIoField(row)
    const draft = drafts[row.name] ?? ""

    if (kind === "accepts") {
      const trimmed = draft.trim()
      if (trimmed === "") {
        const { default: _removed, ...rest } = row.valueSchema
        nextFields.push({ ...row, valueSchema: rest })
        continue
      }

      const parsed = parseEditedLiteral(
        draft,
        row.valueSchema.default,
        port.typeLabel,
        port.valueSchema,
        row.name
      )
      if (!parsed.ok) {
        return { ok: false, error: parsed.error, fieldName: row.name }
      }

      nextFields.push({
        ...row,
        valueSchema: { ...row.valueSchema, default: parsed.value },
      })
      continue
    }

    nextFields.push(row)
  }

  return { ok: true, fields: nextFields }
}

/** Whether the coarse type picker should stay enabled for this field. */
export function ioFieldTypePickerDisabled(field: WorkflowIoField): boolean {
  return hasConnectionConstraints(field.valueSchema)
}

/** Infer editor kind for an I/O field (accepts configure preview). */
export function editorKindForIoField(field: WorkflowIoField) {
  return editorKindForPort(portFromIoField(field))
}
