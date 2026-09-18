import type { WorkflowManifest } from "@executioncontrolprotocol/types"

/** Legacy dual fluent+manifest schema (drop / import only). */
export const WORKFLOW_BUNDLE_SCHEMA = "@executioncontrolprotocol.workflow.bundle"

/** Canonical workflow manifest schema. */
export const WORKFLOW_MANIFEST_SCHEMA = "@executioncontrolprotocol.workflow"

/** Download / drop format choice. */
export type WorkflowDownloadFormat = "fluent" | "manifest"

/** List entry from host workflow-list. */
export interface WorkflowListEntry {
  id: string
  label: string
  updatedAt: string
}

/** Host-loaded workflow (Fluent source + metadata). */
export interface HostWorkflowRecord {
  id: string
  label: string
  updatedAt: string
  fluent: string
}

/** Result of parsing a dropped or downloaded workflow file. */
export type ParsedWorkflowFile =
  | { kind: "fluent"; fluent: string }
  | { kind: "manifest"; manifest: WorkflowManifest }
  | {
      kind: "legacy-bundle"
      id: string
      label: string
      fluent: string
      manifest: WorkflowManifest
    }

/**
 * Sanitize a download / save filename stem.
 */
export function sanitizeWorkflowFilename(idOrLabel: string): string {
  const safe = idOrLabel
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return safe || "workflow"
}

/**
 * Filename for Fluent download.
 */
export function workflowFluentDownloadName(idOrLabel: string): string {
  return `${sanitizeWorkflowFilename(idOrLabel)}.workflow.ts`
}

/**
 * Filename for manifest JSON download.
 */
export function workflowManifestDownloadName(idOrLabel: string): string {
  return `${sanitizeWorkflowFilename(idOrLabel)}.workflow.json`
}

/**
 * Trigger a browser download of Fluent TypeScript source.
 */
export function downloadWorkflowFluent(fluent: string, idOrLabel: string): void {
  const blob = new Blob([fluent], { type: "text/typescript" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = workflowFluentDownloadName(idOrLabel)
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Trigger a browser download of a plain workflow manifest JSON.
 */
export function downloadWorkflowManifest(manifest: WorkflowManifest, idOrLabel: string): void {
  const json = JSON.stringify(manifest, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = workflowManifestDownloadName(idOrLabel)
  anchor.click()
  URL.revokeObjectURL(url)
}

function isWorkflowManifest(value: unknown): value is WorkflowManifest {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return row.schema === WORKFLOW_MANIFEST_SCHEMA
}

/**
 * Parse a dropped file as Fluent source, plain manifest, or legacy dual bundle.
 */
export function parseDroppedWorkflowFile(text: string, fileName?: string): ParsedWorkflowFile {
  const trimmed = text.trim()
  const lowerName = (fileName ?? "").toLowerCase()

  if (
    lowerName.endsWith(".ts") ||
    lowerName.endsWith(".tsx") ||
    lowerName.endsWith(".workflow.ts")
  ) {
    if (!trimmed) throw new Error("Fluent workflow file is empty")
    return { kind: "fluent", fluent: text }
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new Error("File looks like JSON but could not be parsed")
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Workflow JSON must be an object")
    }
    const row = parsed as Record<string, unknown>
    if (row.schema === WORKFLOW_BUNDLE_SCHEMA) {
      if (typeof row.fluent !== "string") {
        throw new Error("Legacy workflow bundle fluent source is required")
      }
      if (!isWorkflowManifest(row.manifest)) {
        throw new Error("Legacy workflow bundle manifest is invalid")
      }
      if (typeof row.id !== "string" || !row.id.trim()) {
        throw new Error("Legacy workflow bundle id is required")
      }
      if (typeof row.label !== "string" || !row.label.trim()) {
        throw new Error("Legacy workflow bundle label is required")
      }
      return {
        kind: "legacy-bundle",
        id: row.id.trim(),
        label: row.label.trim(),
        fluent: row.fluent,
        manifest: row.manifest,
      }
    }
    if (isWorkflowManifest(parsed)) {
      return { kind: "manifest", manifest: parsed }
    }
    throw new Error(
      `Unrecognized workflow JSON schema (expected ${WORKFLOW_MANIFEST_SCHEMA} or legacy bundle)`
    )
  }

  // Bare Fluent without a .ts extension (e.g. paste / misnamed file).
  if (
    trimmed.includes("workflow(") ||
    trimmed.includes("from \"@executioncontrolprotocol") ||
    trimmed.includes("from '@executioncontrolprotocol")
  ) {
    return { kind: "fluent", fluent: text }
  }

  throw new Error("Unrecognized workflow file (expected Fluent .ts or workflow JSON)")
}
