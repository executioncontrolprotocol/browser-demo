import type { ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import type { ConfigEditorKind } from "./step-configure.js"
import { editorKindForPort } from "./step-configure.js"
import { isFileValueSchema } from "./run-form-files.js"
import { collectMediaRefs, type CollectedMediaRef } from "./run-media-refs.js"

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/**
 * Read a single returns-property value from `result.output`.
 * @category Demo
 */
export function valueForReturnPort(output: unknown, portName: string): unknown {
  if (!isRecord(output)) return undefined
  if (!(portName in output)) return undefined
  return output[portName]
}

/**
 * Pretty-print a value that is not a primitive scalar.
 * Prefer a lone `text` string field (common model-generate shape) when present.
 */
function formatStructuredDisplay(value: unknown): string {
  if (isRecord(value) && typeof value.text === "string") {
    const keys = Object.keys(value)
    if (keys.length === 1 || (keys.length === 2 && "usage" in value)) {
      return value.text
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

/**
 * Format a scalar (or short) value for read-only display.
 * @category Demo
 */
export function formatScalarDisplay(value: unknown, kind: ConfigEditorKind): string {
  if (value === undefined) return ""
  if (value === null) return "null"
  switch (kind) {
    case "boolean":
      return value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : String(value)
    case "number":
      return typeof value === "number" ? String(value) : String(value)
    case "string":
    case "longtext":
    case "enum":
    case "enum-radio":
      if (typeof value === "string") return value
      if (typeof value === "number" || typeof value === "boolean") return String(value)
      return formatStructuredDisplay(value)
    case "multiselect":
      if (Array.isArray(value)) {
        if (value.every((v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
          return value.map((v) => String(v)).join(", ")
        }
        return formatStructuredDisplay(value)
      }
      return formatStructuredDisplay(value)
    case "json":
    case "file":
      return formatStructuredDisplay(value)
    default:
      return formatStructuredDisplay(value)
  }
}

/**
 * Whether a return value should render in a preformatted block.
 * @category Demo
 */
export function isStructuredReturnDisplay(value: unknown, kind: ConfigEditorKind): boolean {
  if (value === null || value === undefined) return false
  if (kind === "json" || kind === "file") return true
  if (kind === "multiselect" && Array.isArray(value)) {
    return !value.every((v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
  }
  if (kind === "string" || kind === "longtext" || kind === "enum" || kind === "enum-radio") {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return false
    if (isRecord(value) && typeof value.text === "string") {
      const keys = Object.keys(value)
      if (keys.length === 1 || (keys.length === 2 && "usage" in value)) return false
    }
    return typeof value === "object"
  }
  return typeof value === "object"
}

/**
 * Whether a returns port value should render as media preview.
 * @category Demo
 */
export function isMediaReturnValue(port: ReactFlowPort, value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (editorKindForPort(port) === "file") return true
  if (isFileValueSchema(port.valueSchema, port.typeLabel, port.name)) return true
  return collectMediaRefs(value, port.name).length > 0
}

/**
 * Collect media refs under a single mapped output field.
 * @category Demo
 */
export function mediaRefsForReturnValue(portName: string, value: unknown): CollectedMediaRef[] {
  return collectMediaRefs(value, portName, { skipSourceEchoes: true })
}

/**
 * Paths (exact or prefix) covered by schema-mapped file/media ports.
 * Used to avoid duplicating those refs in a leftover media list.
 * @category Demo
 */
export function mappedMediaPathPrefixes(
  ports: ReactFlowPort[],
  output: unknown
): Set<string> {
  const prefixes = new Set<string>()
  for (const port of ports) {
    const value = valueForReturnPort(output, port.name)
    if (!isMediaReturnValue(port, value)) continue
    prefixes.add(port.name)
    for (const ref of mediaRefsForReturnValue(port.name, value)) {
      prefixes.add(ref.path)
    }
  }
  return prefixes
}

/**
 * Filter media refs that are not already shown under a mapped returns field.
 * @category Demo
 */
export function filterUnmappedMediaRefs(
  refs: CollectedMediaRef[],
  mappedPrefixes: Set<string>
): CollectedMediaRef[] {
  if (mappedPrefixes.size === 0) return refs
  return refs.filter((ref) => {
    if (mappedPrefixes.has(ref.path)) return false
    for (const prefix of mappedPrefixes) {
      if (ref.path === prefix || ref.path.startsWith(`${prefix}.`) || ref.path.startsWith(`${prefix}[`)) {
        return false
      }
    }
    return true
  })
}

/**
 * Pretty JSON for debug disclosures.
 * @category Demo
 */
export function formatOutputDebugJson(value: unknown): string {
  if (value === undefined) return ""
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
