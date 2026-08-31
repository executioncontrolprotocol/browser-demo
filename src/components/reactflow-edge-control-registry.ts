import { createContext, type Dispatch, type SetStateAction } from "react"

/** Mid-path control anchor for a selected data edge (flow coordinates). */
export interface EdgeMenuControlState {
  edgeId: string
  labelX: number
  labelY: number
  target: string
  targetHandle: string
}

/** Selected edge registers flow-space midpoint for the canvas overlay control. */
export const ReactFlowEdgeControlRegistryContext = createContext<
  Dispatch<SetStateAction<EdgeMenuControlState | null>> | undefined
>(undefined)
