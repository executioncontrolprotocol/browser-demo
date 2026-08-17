import { useContext, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Handle, Position, useConnection, type NodeProps } from "@xyflow/react"
import type { ReactFlowIoData, ReactFlowPort } from "@executioncontrolprotocol/format-reactflow"
import { portsAreCompatible } from "../lib/step-connect.js"
import { RETURNS_PLACEHOLDER_HANDLE } from "../lib/workflow-io.js"
import { ReactFlowConfigureContext } from "./reactflow-configure-context.js"

/** Props data for {@link EcpIoNode}. */
export interface EcpIoNodeData extends ReactFlowIoData {
  connectedTargetHandles?: string[]
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

/** Projected Inputs / Outputs node (not a capability step). */
export function EcpIoNode({ id, data }: NodeProps) {
  const io = data as unknown as EcpIoNodeData
  const onConfigure = useContext(ReactFlowConfigureContext)
  const showConfigure = Boolean(onConfigure)
  const connectedTargets = new Set(io.connectedTargetHandles ?? [])
  const connectedSources = new Set(io.connectedSourceHandles ?? [])
  const isReturns = io.kind === "returns"

  const connection = useConnection()
  const dragFromOutput =
    connection.inProgress && connection.fromHandle?.type === "source"
      ? {
          nodeId: connection.fromNode.id,
          handleId: connection.fromHandle.id,
          port: findPort(
            (connection.fromNode.data as { outputs?: ReactFlowPort[] } | undefined)?.outputs,
            connection.fromHandle.id
          ),
        }
      : null

  return (
    <div className="ecp-rf-node ecp-rf-node--io min-w-[180px] rounded-lg border border-dashed border-outline-variant bg-surface-container px-3 py-2 shadow-sm">
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[11px] font-semibold leading-tight text-on-surface">
            {io.label}
          </div>
          <div className="mt-1 font-mono text-[10px] text-on-surface-variant">
            {isReturns ? "workflow.returns" : "workflow.accepts"}
          </div>
        </div>
        {showConfigure ? (
          <button
            type="button"
            className="nodrag nopan nowheel relative z-10 shrink-0 cursor-pointer rounded border border-outline-variant bg-surface-container-high px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-on-surface-variant hover:border-outline hover:text-on-surface"
            onPointerDown={stopCanvasGesture}
            onMouseDown={stopCanvasGesture}
            onClick={(e) => {
              e.stopPropagation()
              onConfigure?.(id)
            }}
          >
            Configure
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        {io.inputs.map((port) => {
          const placeholder = port.id === RETURNS_PLACEHOLDER_HANDLE
          const connected = !placeholder && (port.binding === "ref" || connectedTargets.has(port.id))
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
                {placeholder ? "connect to add" : port.name}
                {placeholder ? null : (
                  <span className="text-outline">:{port.typeLabel}</span>
                )}
                {port.required ? <span className="text-primary">!</span> : null}
                {!placeholder && port.binding === "ref" && port.refPath ? (
                  <span className="text-tertiary-fixed-dim" title={port.refPath}>
                    {" "}
                    ← {port.refPath}
                  </span>
                ) : null}
              </span>
            </div>
          )
        })}

        {io.outputs.map((port) => {
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

        {io.inputs.length === 0 && io.outputs.length === 0 ? (
          <p className="font-mono text-[10px] text-outline">No parameters</p>
        ) : null}
      </div>
    </div>
  )
}
