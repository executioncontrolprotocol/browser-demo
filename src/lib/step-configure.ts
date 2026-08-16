import type { ReactFlowPort, ReactFlowStepData } from "@executioncontrolprotocol/format-reactflow"
import type { StepNode, WorkflowNode } from "@executioncontrolprotocol/types"

const LONG_TEXT_PARAM_NAMES = new Set(["prompt", "system", "instructions", "query", "text"])

/** UI editor kind inferred from an EQL-ish type label. */
export type ConfigEditorKind = "string" | "number" | "boolean" | "json"

function isStepNode(node: WorkflowNode): node is StepNode {
  return !node.type || node.type === "step"
}

/** Walk a workflow tree for a step by id. */
export function findStepById(nodes: WorkflowNode[], stepId: string): StepNode | undefined {
  for (const node of nodes) {
    if (isStepNode(node) && node.id === stepId) return node
    if (node.type === "parallel") {
      for (const branch of node.branches) {
        const found = findStepById(branch, stepId)
        if (found) return found
      }
      continue
    }
    if (node.type === "branch") {
      for (const arm of node.branches) {
        const found = findStepById(arm.steps, stepId)
        if (found) return found
      }
      continue
    }
    if (node.type === "loop") {
      const found = findStepById(node.steps, stepId)
      if (found) return found
    }
  }
  return undefined
}

/** Prefer textarea for long string params. */
export function isLongTextParam(name: string, valueTitle: string | undefined): boolean {
  if (LONG_TEXT_PARAM_NAMES.has(name)) return true
  return (valueTitle?.length ?? 0) > 80 || (valueTitle?.includes("\n") ?? false)
}

/** Strip trailing `!` from EQL type labels. */
export function normalizeTypeLabel(typeLabel: string): string {
  return typeLabel.replace(/!+$/, "").trim().toLowerCase()
}

/**
 * Map Zod/EQL type labels to a configure-dialog editor.
 * Examples: `string!` → string, `number` → number, `object` → json.
 */
export function editorKindForTypeLabel(typeLabel: string): ConfigEditorKind {
  const base = normalizeTypeLabel(typeLabel)
  if (base === "number" || base === "int" || base === "integer" || base === "float") return "number"
  if (base === "boolean" || base === "bool") return "boolean"
  if (
    base === "object" ||
    base === "array" ||
    base === "record" ||
    base === "json" ||
    base === "unknown"
  ) {
    return "json"
  }
  return "string"
}

/** Default draft / typed value when adding a new unbound parameter. */
export function defaultDraftForKind(kind: ConfigEditorKind): string {
  switch (kind) {
    case "number":
      return "0"
    case "boolean":
      return "false"
    case "json":
      return "{}"
    case "string":
    default:
      return ""
  }
}

export function defaultTypedValueForKind(kind: ConfigEditorKind): unknown {
  switch (kind) {
    case "number":
      return 0
    case "boolean":
      return false
    case "json":
      return {}
    case "string":
    default:
      return ""
  }
}

/** Literal input ports that can be edited in the configure dialog. */
export function literalPorts(step: ReactFlowStepData): ReactFlowPort[] {
  return step.inputs.filter((p) => p.binding === "literal")
}

/** Ref-bound input ports (read-only in the configure dialog). */
export function refPorts(step: ReactFlowStepData): ReactFlowPort[] {
  return step.inputs.filter((p) => p.binding === "ref")
}

/**
 * Schema inputs that are not yet literal- or ref-bound — candidates for “Add parameter”.
 */
export function unboundPorts(step: ReactFlowStepData): ReactFlowPort[] {
  return step.inputs.filter((p) => p.binding === undefined)
}

function isRefValue(value: unknown): value is { $ref: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$ref" in value &&
    typeof (value as { $ref: unknown }).$ref === "string"
  )
}

/** Rewrite `state.<fromAs>[...]` refs to `state.<toAs>[...]`. */
export function rewriteStateRefPath(refPath: string, fromAs: string, toAs: string): string {
  const normalized = refPath.startsWith("state.") ? refPath.slice("state.".length) : refPath
  if (normalized === fromAs) return `state.${toAs}`
  if (normalized.startsWith(`${fromAs}.`)) {
    return `state.${toAs}.${normalized.slice(fromAs.length + 1)}`
  }
  return refPath.startsWith("state.") ? refPath : `state.${refPath}`
}

function rewriteRefsInValue(value: unknown, fromAs: string, toAs: string): unknown {
  if (isRefValue(value)) {
    return { ...value, $ref: rewriteStateRefPath(value.$ref, fromAs, toAs) }
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteRefsInValue(item, fromAs, toAs))
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = rewriteRefsInValue(nested, fromAs, toAs)
    }
    return out
  }
  return value
}

/** Deep-clone step inputs with state refs rewritten for an `as` rename. */
export function rewriteStepInputRefs(
  input: Record<string, unknown> | undefined,
  fromAs: string,
  toAs: string
): Record<string, unknown> | undefined {
  if (!input) return input
  return rewriteRefsInValue(input, fromAs, toAs) as Record<string, unknown>
}

/** Walk workflow steps and rewrite `$ref` paths after an `as` rename. */
export function rewriteWorkflowAsRefs(
  nodes: WorkflowNode[],
  fromAs: string,
  toAs: string
): WorkflowNode[] {
  return nodes.map((node) => {
    if (isStepNode(node)) {
      return {
        ...node,
        input: rewriteStepInputRefs(
          node.input as Record<string, unknown> | undefined,
          fromAs,
          toAs
        ) as StepNode["input"],
      }
    }
    if (node.type === "parallel") {
      return {
        ...node,
        branches: node.branches.map((branch) => rewriteWorkflowAsRefs(branch, fromAs, toAs)),
      }
    }
    if (node.type === "branch") {
      return {
        ...node,
        branches: node.branches.map((arm) => ({
          ...arm,
          steps: rewriteWorkflowAsRefs(arm.steps, fromAs, toAs),
        })),
      }
    }
    return {
      ...node,
      steps: rewriteWorkflowAsRefs(node.steps, fromAs, toAs),
    }
  })
}

/** Payload from the step configure dialog. */
export interface StepConfigureSavePayload {
  /** Literal parameter values currently active in the dialog. */
  literals: Record<string, unknown>
  /** Literal keys present before edit that the user removed. */
  removedKeys: string[]
  /** Commit key (`as`); empty string clears it. */
  asKey: string
}

export type ParseLiteralResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string }

/**
 * Coerce configure-dialog text back to a typed literal.
 * Uses `original` when present; otherwise `typeLabel` for newly added fields.
 */
export function parseEditedLiteral(
  text: string,
  original: unknown,
  typeLabel?: string
): ParseLiteralResult {
  if (original !== undefined) {
    if (typeof original === "string") {
      return { ok: true, value: text }
    }
    if (typeof original === "number") {
      const trimmed = text.trim()
      if (trimmed === "") return { ok: false, error: "Expected a number" }
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return { ok: false, error: "Expected a number" }
      return { ok: true, value: n }
    }
    if (typeof original === "boolean") {
      const trimmed = text.trim().toLowerCase()
      if (trimmed === "true") return { ok: true, value: true }
      if (trimmed === "false") return { ok: true, value: false }
      return { ok: false, error: "Expected true or false" }
    }
    if (original === null) {
      const trimmed = text.trim()
      if (trimmed === "null") return { ok: true, value: null }
      try {
        return { ok: true, value: JSON.parse(trimmed) as unknown }
      } catch {
        return { ok: false, error: "Expected null or JSON" }
      }
    }
    if (typeof original === "object") {
      try {
        return { ok: true, value: JSON.parse(text) as unknown }
      } catch {
        return { ok: false, error: "Invalid JSON" }
      }
    }
    return { ok: true, value: text }
  }

  const kind = editorKindForTypeLabel(typeLabel ?? "string")
  switch (kind) {
    case "number": {
      const trimmed = text.trim()
      if (trimmed === "") return { ok: false, error: "Expected a number" }
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return { ok: false, error: "Expected a number" }
      return { ok: true, value: n }
    }
    case "boolean": {
      const trimmed = text.trim().toLowerCase()
      if (trimmed === "true") return { ok: true, value: true }
      if (trimmed === "false") return { ok: true, value: false }
      return { ok: false, error: "Expected true or false" }
    }
    case "json": {
      try {
        return { ok: true, value: JSON.parse(text) as unknown }
      } catch {
        return { ok: false, error: "Invalid JSON" }
      }
    }
    case "string":
    default:
      return { ok: true, value: text }
  }
}
