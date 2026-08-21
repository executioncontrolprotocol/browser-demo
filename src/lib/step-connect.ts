import type { StepNode } from "@executioncontrolprotocol/types"
import { normalizeTypeLabel } from "./step-configure.js"

/** Whole-step output handle id used when the `$ref` has no field path. */
export const OUTPUT_HANDLE_ID = "output"

/** Normalized port kinds used for connect compatibility (demo-local). */
export type PortTypeKind = "string" | "number" | "boolean" | "object" | "array" | "unknown"

/** Minimal port shape for type compatibility checks. */
export interface PortTypeSource {
  typeLabel?: string
  valueSchema?: Record<string, unknown>
}

/** Result of building a `$ref` path from a source handle. */
export type BuildStateRefResult =
  | { ok: true; refPath: string }
  | { ok: false; error: string }

/** Result of validating / building a port connection. */
export type PortConnectionResult =
  | { ok: true; refPath: string; paramName: string }
  | { ok: false; error: string }

function kindFromSchemaType(type: unknown): PortTypeKind | undefined {
  if (type === "string") return "string"
  if (type === "number" || type === "integer") return "number"
  if (type === "boolean") return "boolean"
  if (type === "object") return "object"
  if (type === "array") return "array"
  if (type === "null") return "unknown"
  return undefined
}

function kindFromTypeLabel(typeLabel: string | undefined): PortTypeKind {
  const base = normalizeTypeLabel(typeLabel ?? "")
  if (!base || base === "unknown") return "unknown"
  if (base === "string" || base === "file") return "string"
  if (base === "number" || base === "int" || base === "integer" || base === "float") return "number"
  if (base === "boolean" || base === "bool") return "boolean"
  if (base === "object" || base === "record" || base === "json") return "object"
  if (base === "array") return "array"
  return "unknown"
}

/**
 * Normalize a port's `valueSchema` / `typeLabel` to a connect compatibility kind.
 */
export function portTypeKind(port: PortTypeSource): PortTypeKind {
  const schema = port.valueSchema
  if (schema && Object.keys(schema).length > 0) {
    const fromType = kindFromSchemaType(schema.type)
    if (fromType) return fromType
    // Constraints without a type (e.g. bare enum) — treat as string for wiring.
    if (schema.type === undefined && Array.isArray(schema.enum)) return "string"
    return "unknown"
  }
  return kindFromTypeLabel(port.typeLabel)
}

/**
 * Whether an output port may wire to an input port (same kind, or either unknown).
 */
export function portsAreCompatible(source: PortTypeSource, target: PortTypeSource): boolean {
  const a = portTypeKind(source)
  const b = portTypeKind(target)
  if (a === "unknown" || b === "unknown") return true
  return a === b
}

/**
 * Build a manifest `$ref` path from a source store key and React Flow source handle.
 * `output` → `state.<as>`; any other handle → `state.<as>.<handle>`.
 */
export function buildStateRefFromConnection(args: {
  sourceAs: string | undefined
  sourceHandle: string | null | undefined
}): BuildStateRefResult {
  const asKey = args.sourceAs?.trim()
  if (!asKey) {
    return {
      ok: false,
      error: "Set a store key (as) on the source step before connecting.",
    }
  }

  const handle = (args.sourceHandle ?? "").trim()
  if (!handle) {
    return { ok: false, error: "Missing source handle" }
  }

  if (handle === OUTPUT_HANDLE_ID) {
    return { ok: true, refPath: `state.${asKey}` }
  }

  return { ok: true, refPath: `state.${asKey}.${handle}` }
}

/**
 * Validate an output→input connection and produce the `$ref` + target param name.
 */
export function resolvePortConnection(args: {
  sourceAs: string | undefined
  sourceHandle: string | null | undefined
  targetHandle: string | null | undefined
  /** When set, target handle must be one of these input port names/ids. */
  allowedTargetParams?: ReadonlySet<string> | readonly string[]
}): PortConnectionResult {
  const targetHandle = (args.targetHandle ?? "").trim()
  if (!targetHandle) {
    return { ok: false, error: "Missing target handle" }
  }

  const sourceHandle = (args.sourceHandle ?? "").trim()
  if (!sourceHandle) {
    return { ok: false, error: "Missing source handle" }
  }

  // Reject obvious wrong-direction wiring (same handle used as both ends is rare;
  // callers should only fire onConnect for source→target from RF).
  if (args.allowedTargetParams) {
    const allowed =
      args.allowedTargetParams instanceof Set
        ? args.allowedTargetParams
        : new Set(args.allowedTargetParams)
    if (!allowed.has(targetHandle)) {
      return { ok: false, error: `Unknown input port: ${targetHandle}` }
    }
  }

  const built = buildStateRefFromConnection({
    sourceAs: args.sourceAs,
    sourceHandle,
  })
  if (!built.ok) return built

  return { ok: true, refPath: built.refPath, paramName: targetHandle }
}

/**
 * Set `step.input[paramName] = { $ref }` (replaces any prior literal or ref).
 */
export function applyPortConnection(
  step: StepNode,
  paramName: string,
  refPath: string
): StepNode {
  const normalized = refPath.startsWith("state.") ? refPath : `state.${refPath}`
  const previous = (step.input ?? {}) as Record<string, unknown>
  return {
    ...step,
    input: {
      ...previous,
      [paramName]: { $ref: normalized },
    } as StepNode["input"],
  }
}

/**
 * Remove an input binding so the port becomes unbound again.
 */
export function removePortBinding(step: StepNode, paramName: string): StepNode {
  const previous = (step.input ?? {}) as Record<string, unknown>
  if (!(paramName in previous)) return step
  const next = { ...previous }
  delete next[paramName]
  const nextStep: StepNode = { ...step }
  if (Object.keys(next).length === 0) {
    delete nextStep.input
  } else {
    nextStep.input = next as StepNode["input"]
  }
  return nextStep
}
