import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { ReactFlowStepData } from "@executioncontrolprotocol/format-reactflow"

/** Props data for {@link EcpStepNode}. */
export interface EcpStepNodeData extends ReactFlowStepData {
  /** Extra CSS class for run status. */
  statusClass?: string
}

/** Custom React Flow node with Zod-backed input/output ports. */
export function EcpStepNode({ data }: NodeProps) {
  const step = data as unknown as EcpStepNodeData
  const statusClass = step.statusClass ?? ""

  return (
    <div
      className={`ecp-rf-node rounded-lg border border-outline-variant bg-surface-container px-3 py-2 shadow-sm ${statusClass}`}
    >
      <div className="mb-2 min-w-[160px]">
        <div className="font-display text-sm font-semibold text-on-surface">{step.label}</div>
        {step.uses ? (
          <div className="mt-0.5 truncate font-mono text-[10px] text-on-surface-variant" title={step.uses}>
            {step.uses}
          </div>
        ) : null}
        {step.as ? (
          <div className="mt-0.5 font-mono text-[10px] text-primary-fixed">as {step.as}</div>
        ) : null}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          {step.inputs.map((port) => (
            <div key={`in-${port.id}`} className="relative flex items-center pl-2">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className="!h-2 !w-2 !border-outline-variant !bg-tertiary-fixed-dim"
              />
              <span className="font-mono text-[10px] text-on-surface-variant">
                {port.name}
                <span className="text-outline">:{port.typeLabel}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col items-end gap-1">
          {step.outputs.map((port) => (
            <div key={`out-${port.id}`} className="relative flex items-center justify-end pr-2">
              <span className="font-mono text-[10px] text-on-surface-variant">
                {port.name}
                <span className="text-outline">:{port.typeLabel}</span>
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                className="!h-2 !w-2 !border-outline-variant !bg-primary"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
