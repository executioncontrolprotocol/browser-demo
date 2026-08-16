import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { ReactFlowStepData } from "@executioncontrolprotocol/format-reactflow"

/** Props data for {@link EcpStepNode}. */
export interface EcpStepNodeData extends ReactFlowStepData {
  /** Extra CSS class for run status. */
  statusClass?: string
}

/** Custom React Flow node with Zod-backed ports (inputs top-left, outputs below right). */
export function EcpStepNode({ data }: NodeProps) {
  const step = data as unknown as EcpStepNodeData
  const statusClass = step.statusClass ?? ""

  return (
    <div
      className={`ecp-rf-node min-w-[200px] rounded-lg border border-outline-variant bg-surface-container px-3 py-2 shadow-sm ${statusClass}`}
    >
      <div className="mb-2 min-w-0">
        <div className="font-display text-[11px] font-semibold leading-tight text-on-surface">{step.label}</div>
        {step.uses ? (
          <div
            className="mt-1 break-all font-mono text-[10px] leading-snug text-on-surface-variant"
            title={step.uses}
          >
            {step.uses}
          </div>
        ) : null}
        {step.as ? (
          <div className="mt-1 font-mono text-[10px] text-primary-fixed">as {step.as}</div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
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
              {port.required ? <span className="text-primary">!</span> : null}
            </span>
          </div>
        ))}

        {step.outputs.map((port) => (
          <div key={`out-${port.id}`} className="relative flex items-center justify-end pr-2">
            <span className="font-mono text-[10px] text-on-surface-variant">
              {port.name}
              <span className="text-outline">:{port.typeLabel}</span>
              {port.required ? <span className="text-primary">!</span> : null}
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
  )
}
