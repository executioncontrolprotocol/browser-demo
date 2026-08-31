import { useEffect } from "react"
import { useUpdateNodeInternals } from "@xyflow/react"

/**
 * Re-measure handle positions after port lists change so data edges render.
 * React Flow does not always pick up dynamic handles on first paint.
 */
export function useSyncNodeHandles(
  nodeId: string,
  inputIds: readonly string[],
  outputIds: readonly string[]
): void {
  const updateNodeInternals = useUpdateNodeInternals()
  const signature = `${inputIds.join("\0")}\0${outputIds.join("\0")}`

  useEffect(() => {
    updateNodeInternals(nodeId)
  }, [nodeId, signature, updateNodeInternals])
}
