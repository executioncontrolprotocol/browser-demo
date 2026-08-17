import { createContext, type MouseEvent as ReactMouseEvent } from "react"

/** Edge identity used to open the route menu from the mid-path control. */
export interface EdgeMenuTarget {
  id: string
  target: string
  targetHandle: string
}

/** Open the route menu from an edge click or the mid-path ellipsis. */
export const ReactFlowEdgeMenuContext = createContext<
  ((event: ReactMouseEvent, edge: EdgeMenuTarget) => void) | undefined
>(undefined)
