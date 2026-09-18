import type { Ecp } from "@executioncontrolprotocol/core"
import type { HostWorkflowRecord, WorkflowListEntry } from "./workflow-bundle.js"

const CAP_SAVE = "@executioncontrolprotocol/storage.workflow-save"
const CAP_LIST = "@executioncontrolprotocol/storage.workflow-list"
const CAP_LOAD = "@executioncontrolprotocol/storage.workflow-load"
const CAP_DELETE = "@executioncontrolprotocol/storage.workflow-delete"

function invokeError(result: { success: boolean; diagnostics?: Array<{ message?: string }> }): string {
  const msg = result.diagnostics?.map((d) => d.message).filter(Boolean).join("; ")
  return msg || "Host workflow storage invoke failed"
}

/**
 * Save Fluent workflow source to the paired host (`~/.ecp/workflows/<id>.workflow.ts`).
 */
export async function hostSaveWorkflow(
  ecp: Ecp,
  input: { id: string; label?: string; fluent: string }
): Promise<{ id: string }> {
  const result = await ecp
    .invoke(CAP_SAVE)
    .with({
      id: input.id,
      label: input.label,
      fluent: input.fluent,
    })
    .process<{ id?: string; ok?: boolean }>()
  if (!result.success || !result.result?.ok || typeof result.result.id !== "string") {
    throw new Error(invokeError(result))
  }
  return { id: result.result.id }
}

/**
 * List workflows saved on the paired host.
 */
export async function hostListWorkflows(ecp: Ecp): Promise<WorkflowListEntry[]> {
  const result = await ecp
    .invoke(CAP_LIST)
    .with({})
    .process<{ workflows?: WorkflowListEntry[] }>()
  if (!result.success) {
    throw new Error(invokeError(result))
  }
  return Array.isArray(result.result?.workflows) ? result.result.workflows : []
}

/**
 * Load one Fluent workflow from the paired host.
 */
export async function hostLoadWorkflow(ecp: Ecp, id: string): Promise<HostWorkflowRecord> {
  const result = await ecp
    .invoke(CAP_LOAD)
    .with({ id })
    .process<{
      id?: string
      label?: string
      updatedAt?: string
      fluent?: string
    }>()
  if (!result.success) {
    throw new Error(invokeError(result))
  }
  const row = result.result
  if (!row || typeof row.fluent !== "string") {
    throw new Error(`Workflow not found: ${id}`)
  }
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : id,
    label:
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : id,
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt.trim()
        ? row.updatedAt.trim()
        : new Date(0).toISOString(),
    fluent: row.fluent,
  }
}

/**
 * Delete one workflow from the paired host.
 */
export async function hostDeleteWorkflow(ecp: Ecp, id: string): Promise<boolean> {
  const result = await ecp
    .invoke(CAP_DELETE)
    .with({ id })
    .process<{ deleted?: boolean; ok?: boolean }>()
  if (!result.success || !result.result?.ok) {
    throw new Error(invokeError(result))
  }
  return Boolean(result.result.deleted)
}
