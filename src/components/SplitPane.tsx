import type { ReactNode } from "react"

/** Props for {@link SplitPane}. */
export interface SplitPaneProps {
  /** Left pane content. */
  left: ReactNode
  /** Right pane content. */
  right: ReactNode
  /** Left pane width in px. */
  leftWidth: number
  /** Whether the left pane is collapsed. */
  leftCollapsed?: boolean
  /** Called when the user starts dragging the divider. */
  onDividerPointerDown: (clientX: number) => void
}

/** Horizontal split layout with draggable divider. */
export function SplitPane({ left, right, leftWidth, leftCollapsed = false, onDividerPointerDown }: SplitPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <aside
        className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-outline-variant bg-surface-container-low transition-[width,opacity] duration-300 ${
          leftCollapsed ? "w-0 opacity-0" : ""
        }`}
        style={leftCollapsed ? undefined : { width: leftWidth }}
        aria-hidden={leftCollapsed}
      >
        {!leftCollapsed ? left : null}
      </aside>
      {!leftCollapsed ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          className="group z-10 w-1.5 shrink-0 cursor-col-resize bg-outline-variant/40 hover:bg-primary/60 active:bg-primary"
          onPointerDown={(e) => {
            e.preventDefault()
            onDividerPointerDown(e.clientX)
          }}
        />
      ) : null}
      <section className="node-canvas relative min-h-0 min-w-0 flex-1 overflow-hidden">{right}</section>
    </div>
  )
}
