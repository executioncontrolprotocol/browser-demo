import { useStore, useReactFlow } from "@xyflow/react"
import type { MouseEvent as ReactMouseEvent, RefObject } from "react"
import type { EdgeMenuControlState } from "./reactflow-edge-control-registry.js"
import type { EdgeMenuTarget } from "./reactflow-edge-menu-context.js"

/** Canvas-local z-index for the mid-path ellipsis (above React Flow nodes/edges). */
const EDGE_MENU_CONTROL_Z_INDEX = 1020

interface EdgeMenuControlOverlayProps {
  canvasRef: RefObject<HTMLDivElement | null>
  control: EdgeMenuControlState | null
  onOpenMenu: (event: ReactMouseEvent, edge: EdgeMenuTarget) => void
}

/**
 * Renders the route ellipsis outside React Flow’s SVG layer so it stays clickable.
 * Position tracks pan/zoom via {@link useReactFlow.flowToScreenPosition}.
 */
export function EdgeMenuControlOverlay({
  canvasRef,
  control,
  onOpenMenu,
}: EdgeMenuControlOverlayProps) {
  useStore((state) => state.transform)
  const { flowToScreenPosition } = useReactFlow()

  if (!control) return null

  const canvas = canvasRef.current
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const screen = flowToScreenPosition({ x: control.labelX, y: control.labelY })
  const left = screen.x - rect.left
  const top = screen.y - rect.top

  return (
    <button
      type="button"
      className="nodrag nopan ecp-rf-edge-menu-btn pointer-events-auto absolute"
      style={{
        left,
        top,
        transform: "translate(-50%, -50%)",
        zIndex: EDGE_MENU_CONTROL_Z_INDEX,
      }}
      aria-label="Connection menu"
      title="Connection menu"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpenMenu(event, {
          id: control.edgeId,
          target: control.target,
          targetHandle: control.targetHandle,
        })
      }}
    >
      <span className="material-symbols-outlined" aria-hidden>
        more_horiz
      </span>
    </button>
  )
}
