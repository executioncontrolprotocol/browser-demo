import { useContext, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Handle, Position, useConnection, type NodeProps } from "@xyflow/react"
import type { ReactFlowPort, ReactFlowStepData } from "@executioncontrolprotocol/format-reactflow"
import { portsAreCompatible } from "../lib/step-connect.js"
import { ReactFlowConfigureContext } from "./reactflow-configure-context.js"

/** Props data for {@link EcpStepNode}. */
export interface EcpStepNodeData extends ReactFlowStepData {
  /** Extra CSS class for run status. */
  statusClass?: string
  /** Host/mixed execution badge. */
  hostBadge?: string
  /** Input port ids that have an incoming data edge. */
  connectedTargetHandles?: string[]
  /** Output port ids that have an outgoing data edge. */
  connectedSourceHandles?: string[]
}

function stopCanvasGesture(e: ReactPointerEvent | ReactMouseEvent): void {
  e.stopPropagation()
}

function handleClass(
  kind: "input" | "output",
  connected: boolean,
  incompatible: boolean
): string {
  const base = "ecp-rf-handle !h-2.5 !w-2.5 !border-[1.5px]"
  const strike = incompatible ? " ecp-rf-handle--incompatible" : ""
  if (connected) {
    return kind === "input"
      ? `${base} ecp-rf-handle--connected ecp-rf-handle--input${strike}`
      : `${base} ecp-rf-handle--connected ecp-rf-handle--output${strike}`
  }
  return kind === "input"
    ? `${base} ecp-rf-handle--idle ecp-rf-handle--input${strike}`
    : `${base} ecp-rf-handle--idle ecp-rf-handle--output${strike}`
}

function findPort(
  ports: ReactFlowPort[] | undefined,
  handleId: string | null | undefined
): ReactFlowPort | undefined {
  if (!handleId || !ports) return undefined
  return ports.find((p) => p.id === handleId)
}

/** Custom React Flow node with Zod-backed ports; all schema ports show handles. */
export function EcpStepNode({ id, data }: NodeProps) {
  const step = data as unknown as EcpStepNodeData
  const onConfigureStep = useContext(ReactFlowConfigureContext)
  const statusClass = step.statusClass ?? ""
  const showConfigure = Boolean(onConfigureStep)
  const connectedTargets = new Set(step.connectedTargetHandles ?? [])
  const connectedSources = new Set(step.connectedSourceHandles ?? [])

  const connection = useConnection()
  const dragFromOutput =
    connection.inProgress && connection.fromHandle?.type === "source"
      ? {
          nodeId: connection.fromNode.id,
          handleId: connection.fromHandle.id,
          port: findPort(
            (connection.fromNode.data as unknown as EcpStepNodeData | undefined)?.outputs,
            connection.fromHandle.id
          ),
        }
      : null

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
          {step.hostBadge ? (
            <div className="mt-1 font-mono text-[10px] text-on-surface-variant">{step.hostBadge}</div>
          ) : null}
        </div>
        {showConfigure ? (
          <button
            type="button"
            className="nodrag nopan nowheel relative z-10 shrink-0 cursor-pointer rounded border border-outline-variant bg-surface-container-high px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-on-surface-variant hover:border-outline hover:text-on-surface"
            onPointerDown={stopCanvasGesture}
            onMouseDown={stopCanvasGesture}
            onClick={(e) => {
              e.stopPropagation()
              onConfigureStep?.(id)
            }}
          >
            Configure
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        {step.inputs.map((port) => {
          const connected = port.binding === "ref" || connectedTargets.has(port.id)
          const incompatible =
            dragFromOutput !== null &&
            dragFromOutput.nodeId !== id &&
            dragFromOutput.port !== undefined &&
            !portsAreCompatible(dragFromOutput.port, port)
          const connectable = !incompatible
          return (
            <div
              key={`in-${port.id}`}
              className={`relative flex min-w-0 items-center gap-1 pl-2${
                incompatible ? " ecp-rf-port--incompatible" : ""
              }`}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className={handleClass("input", connected, incompatible)}
                isConnectable={connectable}
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
          )
        })}

        {step.outputs.map((port) => {
          const connected = connectedSources.has(port.id)
          return (
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
                className={handleClass("output", connected, false)}
                isConnectable
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
