import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import {
  createBrowserFileLocator,
  isBrowserFileLocator,
  type CapabilityBlob,
} from "@executioncontrolprotocol/core"
import { IMAGE_REF_KINDS } from "@executioncontrolprotocol/types"

const FILE_FIELD_RE = /^(image|file|filePath|source|blob|photo|upload)$/i
const LOCATOR_ONLY_FIELD_RE = /^(filePath|source)$/i
const IMAGE_REF_FILE_FIELD_RE = /^(image|photo|file|blob|upload)$/i

/**
 * Default `workflow.accepts` schema for the demo `file` type.
 * Values are ImageRef file refs (`path: ecp://browser/<id>`), never base64 payloads.
 */
export const WORKFLOW_FILE_VALUE_SCHEMA: Record<string, unknown> = {
  "x-ecp-file": true,
  type: "object",
  required: ["kind", "path"],
  properties: {
    kind: { type: "string", const: IMAGE_REF_KINDS.FILE },
    path: { type: "string" },
    mediaType: { type: "string" },
    sizeBytes: { type: "number" },
  },
}

/** How a file pick is encoded into run / configure input. */
export type FilePortEncoding = "locator" | "image-ref-file"

/**
 * Whether a JSON Schema hint describes an {@link ImageRef} (object with `kind`).
 */
export function isImageRefValueSchema(schema: Record<string, unknown> | undefined): boolean {
  if (!schema) return false
  if (schema.type === "object" && isRecord(schema.properties)) {
    const kind = schema.properties.kind
    if (isRecord(kind) && Array.isArray(kind.enum)) {
      return kind.enum.some((v) => typeof v === "string" && isImageRefKind(v))
    }
    if (isRecord(kind) && typeof kind.const === "string" && isImageRefKind(kind.const)) {
      return true
    }
  }
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const alts = (schema.oneOf ?? schema.anyOf) as unknown[]
    return alts.some((alt) => isRecord(alt) && isImageRefValueSchema(alt))
  }
  return false
}

/**
 * Whether this schema / label / name should use the file editor.
 */
export function isFileValueSchema(
  valueSchema: Record<string, unknown> | undefined,
  typeLabel?: string,
  fieldName?: string
): boolean {
  if (typeLabel && normalizeTypeLabel(typeLabel) === "file") return true
  if (valueSchema) {
    if (valueSchema["x-ecp-file"] === true) return true
    if (typeof valueSchema.contentMediaType === "string" && valueSchema.contentMediaType.length > 0) {
      return true
    }
    if (valueSchema.format === "binary" || valueSchema.format === "byte") return true
    if (isImageRefValueSchema(valueSchema)) return true
  }
  if (fieldName && FILE_FIELD_RE.test(fieldName)) {
    const t = valueSchema?.type
    if (t === undefined || t === "string" || isImageRefValueSchema(valueSchema)) return true
  }
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
  return isFileValueSchema(port.valueSchema, port.typeLabel, port.name)
}

/** @deprecated Prefer {@link isFilePort}. */
export function isRunFormFilePort(port: ReactFlowPort): boolean {
  return isFilePort(port)
}

/**
 * ImageRef file refs for image/file accepts; plain locator strings for Azure `source` / `filePath`.
 */
export function filePortEncoding(port: {
  name: string
  typeLabel: string
  valueSchema?: Record<string, unknown>
}): FilePortEncoding {
  if (isImageRefValueSchema(port.valueSchema)) return "image-ref-file"
  if (port.valueSchema?.["x-ecp-file"] === true) return "image-ref-file"
  if (normalizeTypeLabel(port.typeLabel) === "file") return "image-ref-file"
  if (IMAGE_REF_FILE_FIELD_RE.test(port.name)) return "image-ref-file"
  if (LOCATOR_ONLY_FIELD_RE.test(port.name)) return "locator"
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
  /** Draft text stored in the form (locator string or ImageRef JSON with path ref). */
  draft: string
  /** Parsed run/configure value. */
  value: unknown
  /** Locator used for the blob stash. */
  locator: string
  /** Blob registered under `locator`. */
  blob: CapabilityBlob
}

/**
 * Encode a browser File as a locator or ImageRef file ref (never base64 file bytes).
 */
export async function encodeFileForPort(
  file: File,
  port: { name: string; typeLabel: string; valueSchema?: Record<string, unknown> }
): Promise<EncodedFileInput> {
  const locator = createBrowserFileLocator()
  const blob = capabilityBlobFromFile(file)
  const mediaType = file.type || undefined

  if (filePortEncoding(port) === "image-ref-file") {
    const value = {
      kind: IMAGE_REF_KINDS.FILE,
      path: locator,
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

/** Extract a browser locator from a file draft (plain string or ImageRef file path). */
export function locatorFromFileDraft(draft: string): string | undefined {
  const trimmed = draft.trim()
  if (isBrowserFileLocator(trimmed)) return trimmed
  if (!trimmed.startsWith("{")) return undefined
  try {
    const parsed = JSON.parse(trimmed) as { kind?: string; path?: string; uri?: string }
    if (parsed.kind === IMAGE_REF_KINDS.FILE && typeof parsed.path === "string") {
      return isBrowserFileLocator(parsed.path) ? parsed.path : undefined
    }
    if (parsed.kind === IMAGE_REF_KINDS.ARTIFACT && typeof parsed.uri === "string") {
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

function isImageRefKind(value: string): boolean {
  return (
    value === IMAGE_REF_KINDS.ARTIFACT ||
    value === IMAGE_REF_KINDS.FILE ||
    value === IMAGE_REF_KINDS.URL ||
    value === IMAGE_REF_KINDS.BUFFER
  )
}

function normalizeTypeLabel(typeLabel: string): string {
  return typeLabel.replace(/!+$/, "").trim().toLowerCase()
}
