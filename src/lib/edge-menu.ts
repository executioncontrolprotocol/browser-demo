/** Gap below the mid-path ellipsis when anchoring the route menu. */
const MENU_BELOW_CONTROL_GAP = 4

/** Viewport box used to convert client coords into canvas-local menu position. */
export interface ViewportBox {
  left: number
  top: number
}

/** Control box used when the menu opens from the mid-path ellipsis. */
export interface ControlBox {
  left: number
  bottom: number
}

/**
 * Canvas-local position for the route menu.
 * Cursor click uses client coords; the ellipsis anchors just below the control.
 */
export function edgeMenuPosition(args: {
  clientX: number
  clientY: number
  canvas?: ViewportBox
  control?: ControlBox
}): { x: number; y: number } {
  const originLeft = args.canvas?.left ?? 0
  const originTop = args.canvas?.top ?? 0
  if (args.control) {
    return {
      x: args.control.left - originLeft,
      y: args.control.bottom - originTop + MENU_BELOW_CONTROL_GAP,
    }
  }
  return {
    x: args.clientX - originLeft,
    y: args.clientY - originTop,
  }
}
