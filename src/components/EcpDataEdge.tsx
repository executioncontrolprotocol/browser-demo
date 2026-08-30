import { useContext, useEffect } from "react"
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react"
import { ReactFlowEdgeControlRegistryContext } from "./reactflow-edge-control-registry.js"

/** Data edge; mid-path menu control is rendered in {@link EdgeMenuControlOverlay}. */
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
  const setEdgeControl = useContext(ReactFlowEdgeControlRegistryContext)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  useEffect(() => {
    if (!selected || !setEdgeControl || !target || !targetHandleId) return
    setEdgeControl({
      edgeId: id,
      labelX,
      labelY,
      target,
      targetHandle: targetHandleId,
    })
    return () => {
      setEdgeControl((current) => (current?.edgeId === id ? null : current))
    }
  }, [selected, setEdgeControl, id, labelX, labelY, target, targetHandleId])

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      interactionWidth={interactionWidth}
    />
  )
}
