import { useContext, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react"
import { ReactFlowEdgeMenuContext } from "./reactflow-edge-menu-context.js"

function stopCanvasGesture(e: ReactPointerEvent | ReactMouseEvent): void {
  e.stopPropagation()
}

/** Data edge with a mid-path ellipsis when selected. */
export function EcpDataEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  interactionWidth,
  selected,
  target,
  targetHandleId,
}: EdgeProps) {
  const onOpenMenu = useContext(ReactFlowEdgeMenuContext)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const showMenuControl = Boolean(selected && onOpenMenu && target && targetHandleId)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={interactionWidth}
      />
      {showMenuControl ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan ecp-rf-edge-menu-btn"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              zIndex: 1,
            }}
            aria-label="Connection menu"
            title="Connection menu"
            onPointerDown={stopCanvasGesture}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (!targetHandleId) return
              onOpenMenu?.(event, { id, target, targetHandle: targetHandleId })
            }}
          >
            <span className="material-symbols-outlined" aria-hidden>
              more_horiz
            </span>
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
