import { useContext, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { ReactFlowStepData } from "@executioncontrolprotocol/format-reactflow"
import { ReactFlowConfigureContext } from "./reactflow-configure-context.js"

/** Props data for {@link EcpStepNode}. */
export interface EcpStepNodeData extends ReactFlowStepData {
  /** Extra CSS class for run status. */
  statusClass?: string
}

function stopCanvasGesture(e: ReactPointerEvent | ReactMouseEvent): void {
  e.stopPropagation()
}

/** Custom React Flow node with Zod-backed ports (inputs top-left, outputs below right). */
export function EcpStepNode({ id, data }: NodeProps) {
  const step = data as unknown as EcpStepNodeData
  const onConfigureStep = useContext(ReactFlowConfigureContext)
  const statusClass = step.statusClass ?? ""
  const hasLiterals = step.inputs.some((p) => p.binding === "literal")

  return (
    <div
      className={`ecp-rf-node min-w-[200px] rounded-lg border border-outline-variant bg-surface-container px-3 py-2 shadow-sm ${statusClass}`}
    >
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
        {hasLiterals && onConfigureStep ? (
          <button
            type="button"
            className="nodrag nopan nowheel relative z-10 shrink-0 cursor-pointer rounded border border-outline-variant bg-surface-container-high px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-on-surface-variant hover:border-outline hover:text-on-surface"
            onPointerDown={stopCanvasGesture}
            onMouseDown={stopCanvasGesture}
            onClick={(e) => {
              e.stopPropagation()
              onConfigureStep(id)
            }}
          >
            Configure
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        {step.inputs.map((port) => (
          <div key={`in-${port.id}`} className="relative flex min-w-0 items-center gap-1 pl-2">
            <Handle
              type="target"
              position={Position.Left}
              id={port.id}
              className="!h-2 !w-2 !border-outline-variant !bg-tertiary-fixed-dim"
            />
            <span className="min-w-0 truncate font-mono text-[10px] text-on-surface-variant">
              {port.name}
              <span className="text-outline">:{port.typeLabel}</span>
              {port.required ? <span className="text-primary">!</span> : null}
              {port.binding === "literal" && port.valuePreview !== undefined ? (
                <span className="text-outline" title={port.valueTitle}>
                  {" "}
                  = {port.valuePreview}
                </span>
              ) : null}
              {port.binding === "ref" && port.refPath ? (
                <span className="text-tertiary-fixed-dim" title={port.refPath}>
                  {" "}
                  ← {port.refPath}
                </span>
              ) : null}
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
