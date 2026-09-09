import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import {
  createBrowserFileLocator,
  isBrowserFileLocator,
  type CapabilityBlob,
} from "@executioncontrolprotocol/core"
import { FILE_REF_KINDS, fileRefValueSchemaHint, isFileRefKind } from "@executioncontrolprotocol/types"

/**
 * Default `workflow.accepts` schema for the demo `file` type.
 * Values are FileRef file refs (`path: ecp://browser/<id>`), never base64 payloads.
 */
export const WORKFLOW_FILE_VALUE_SCHEMA: Record<string, unknown> = fileRefValueSchemaHint()

/** How a file pick is encoded into run / configure input. */
export type FilePortEncoding = "locator" | "file-ref-file"

/**
 * Whether a JSON Schema hint describes a {@link FileRef} (object with `kind`).
 */
export function isFileRefValueSchema(schema: Record<string, unknown> | undefined): boolean {
  if (!schema) return false
  if (schema.type === "object" && isRecord(schema.properties)) {
    const kind = schema.properties.kind
    if (isRecord(kind) && Array.isArray(kind.enum)) {
      return kind.enum.some((v) => typeof v === "string" && isFileRefKind(v))
    }
    if (isRecord(kind) && typeof kind.const === "string" && isFileRefKind(kind.const)) {
      return true
    }
  }
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const alts = (schema.oneOf ?? schema.anyOf) as unknown[]
    return alts.some((alt) => isRecord(alt) && isFileRefValueSchema(alt))
  }
  return false
}

/** @deprecated Prefer {@link isFileRefValueSchema}. */
export const isImageRefValueSchema = isFileRefValueSchema

/**
 * Whether this schema / type label should use the file editor.
 * Driven by type and schema hints only — never by property name.
 */
export function isFileValueSchema(
  valueSchema: Record<string, unknown> | undefined,
  typeLabel?: string,
  _fieldName?: string
): boolean {
  if (typeLabel && normalizeTypeLabel(typeLabel) === "file") return true
  if (!valueSchema) return false
  if (valueSchema["x-ecp-file"] === true) return true
  if (typeof valueSchema.contentMediaType === "string" && valueSchema.contentMediaType.length > 0) {
    return true
  }
  if (Array.isArray(valueSchema.contentMediaType) && valueSchema.contentMediaType.length > 0) {
    return true
  }
  if (valueSchema.format === "binary" || valueSchema.format === "byte") return true
  if (isFileRefValueSchema(valueSchema)) return true
  return false
}

/**
 * Port-level file detection (run form + configure).
 */
export function isFilePort(port: {
  name: string
  typeLabel: string
  valueSchema?: Record<string, unknown>
}): boolean {
  return isFileValueSchema(port.valueSchema, port.typeLabel)
}

/** @deprecated Prefer {@link isFilePort}. */
export function isRunFormFilePort(port: ReactFlowPort): boolean {
  return isFilePort(port)
}

/**
 * FileRef encoding for typed file / FileRef schemas; locator strings for string+media hints.
 */
export function filePortEncoding(port: {
  name: string
  typeLabel: string
  valueSchema?: Record<string, unknown>
}): FilePortEncoding {
  if (isFileRefValueSchema(port.valueSchema)) return "file-ref-file"
  if (port.valueSchema?.["x-ecp-file"] === true) return "file-ref-file"
  if (normalizeTypeLabel(port.typeLabel) === "file") return "file-ref-file"
  return "locator"
}

/** Adapt a browser File to the capability blob map. */
export function capabilityBlobFromFile(file: File): CapabilityBlob {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    arrayBuffer: () => file.arrayBuffer(),
  }
}

/** Result of encoding a picked file into a draft + blob stash. */
export interface EncodedFileInput {
  /** Draft text stored in the form (locator string or FileRef JSON with path ref). */
  draft: string
  /** Parsed run/configure value. */
  value: unknown
  /** Locator used for the blob stash. */
  locator: string
  /** Blob registered under `locator`. */
  blob: CapabilityBlob
}

/**
 * Encode a browser File as a locator or FileRef file ref (never base64 file bytes).
 */
export async function encodeFileForPort(
  file: File,
  port: { name: string; typeLabel: string; valueSchema?: Record<string, unknown> }
): Promise<EncodedFileInput> {
  const locator = createBrowserFileLocator()
  const blob = capabilityBlobFromFile(file)
  const mediaType = file.type || undefined

  if (filePortEncoding(port) === "file-ref-file") {
    const value = {
      kind: FILE_REF_KINDS.FILE,
      path: locator,
      ...(file.name ? { name: file.name } : {}),
      ...(mediaType ? { mediaType } : {}),
      sizeBytes: file.size,
    }
    return {
      draft: JSON.stringify(value, null, 2),
      value,
      locator,
      blob,
    }
  }

  return {
    draft: locator,
    value: locator,
    locator,
    blob,
  }
}

/** Same as {@link encodeFileForPort} — configure also uses refs, never base64 payloads. */
export async function encodeFileForConfigure(
  file: File,
  port: { name: string; typeLabel: string; valueSchema?: Record<string, unknown> }
): Promise<EncodedFileInput> {
  return encodeFileForPort(file, port)
}

/** Whether a draft string is a browser file locator. */
export function isFileDraftLocator(draft: string): boolean {
  return isBrowserFileLocator(draft.trim())
}

/** Extract a browser locator from a file draft (plain string or FileRef file path). */
export function locatorFromFileDraft(draft: string): string | undefined {
  const trimmed = draft.trim()
  if (isBrowserFileLocator(trimmed)) return trimmed
  if (!trimmed.startsWith("{")) return undefined
  try {
    const parsed = JSON.parse(trimmed) as { kind?: string; path?: string; uri?: string }
    if (parsed.kind === FILE_REF_KINDS.FILE && typeof parsed.path === "string") {
      return isBrowserFileLocator(parsed.path) ? parsed.path : undefined
    }
    if (parsed.kind === FILE_REF_KINDS.ARTIFACT && typeof parsed.uri === "string") {
      return isBrowserFileLocator(parsed.uri) ? parsed.uri : undefined
    }
  } catch {
    return undefined
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function normalizeTypeLabel(typeLabel: string): string {
  return typeLabel.replace(/!+$/, "").trim().toLowerCase()
}
