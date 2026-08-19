import type { CapabilityExecution, EnvironmentDescriptor } from "@executioncontrolprotocol/types"

/** Badge copy for host/mixed steps on the React Flow canvas. */
export function capabilityHostBadge(
  execution: CapabilityExecution | undefined,
  paired: boolean
): string | undefined {
  if (execution !== "host" && execution !== "mixed") return undefined
  if (!paired) return "Local host required"
  if (execution === "mixed") return "Runs in tab (local host required)"
  return "Runs on local host"
}

/** Capability id → execution from a describe() descriptor. */
export function capabilityExecutionMap(
  descriptor: EnvironmentDescriptor | null
): Record<string, CapabilityExecution> {
  const out: Record<string, CapabilityExecution> = {}
  for (const cap of descriptor?.capabilities ?? []) {
    if (cap.execution) out[cap.id] = cap.execution
  }
  return out
}
