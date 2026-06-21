import type { ReactNode } from "react"

/** Props for {@link WorkspaceColumn}. */
export interface WorkspaceColumnProps {
  visible: boolean
  widthClass: "is-half" | "is-full"
  children: ReactNode
}

/** Right-hand workspace column hosting workflow or code views. */
export function WorkspaceColumn({ visible, widthClass, children }: WorkspaceColumnProps) {
  if (!visible) return null

  return (
    <div
      className={`workspace-column h-full bg-surface-container-lowest ${widthClass}`}
      id="workspace-column"
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" id="workflow-panel">
        {children}
      </div>
    </div>
  )
}
