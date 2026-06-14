import type { EnvironmentDescriptor } from "@executioncontextprotocol/types"

/** Compact one-line capability summary for the demo UI. */
export function formatRegisteredCapabilitiesSummary(
  descriptor: EnvironmentDescriptor | null
): string {
  if (!descriptor?.capabilities?.length) {
    return "No capabilities registered."
  }
  const ids = descriptor.capabilities.map((c) => c.id).sort()
  return ids.length <= 6 ? ids.join(", ") : `${ids.slice(0, 5).join(", ")}, +${ids.length - 5} more`
}
