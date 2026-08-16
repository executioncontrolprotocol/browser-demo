import { createContext } from "react"

/** Configure-step callback for nodes inside the Flow canvas (avoids storing fns in node data). */
export const ReactFlowConfigureContext = createContext<((stepId: string) => void) | undefined>(
  undefined
)
