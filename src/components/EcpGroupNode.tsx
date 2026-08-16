import type { NodeProps } from "@xyflow/react"
import type { ReactFlowGroupData } from "@executioncontrolprotocol/format-reactflow"

/** Group node for parallel / branch / loop / workflow containers. */
export function EcpGroupNode({ data }: NodeProps) {
  const group = data as unknown as ReactFlowGroupData
  return (
    <div className="ecp-rf-group h-full min-h-[80px] min-w-[200px] rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-low/40 px-2 py-1">
      <div className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
        {group.kind}: {group.label}
      </div>
    </div>
  )
}
