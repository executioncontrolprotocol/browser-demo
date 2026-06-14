import { useCallback, useEffect, useRef, useState } from "react"
import {
  clampSplitWidth,
  readStoredSplitWidth,
  SPLIT_DEFAULT_WIDTH,
  storeSplitWidth,
} from "../lib/split-pane.js"

/** Options for {@link useSplitPane}. */
export interface UseSplitPaneOptions {
  /** Minimum left pane width in px. */
  minWidth?: number
  /** Maximum left pane as fraction of viewport. */
  maxRatio?: number
}

/** Manage draggable horizontal split pane width. */
export function useSplitPane(options: UseSplitPaneOptions = {}) {
  const { minWidth = 280, maxRatio = 0.55 } = options
  const [leftWidth, setLeftWidth] = useState(() => readStoredSplitWidth())
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(SPLIT_DEFAULT_WIDTH)

  const onPointerDown = useCallback(
    (clientX: number) => {
      dragging.current = true
      startX.current = clientX
      startWidth.current = leftWidth
    },
    [leftWidth]
  )

  const onPointerMove = useCallback(
    (clientX: number) => {
      if (!dragging.current) return
      const delta = clientX - startX.current
      const next = clampSplitWidth(startWidth.current + delta, window.innerWidth, minWidth, maxRatio)
      setLeftWidth(next)
    },
    [minWidth, maxRatio]
  )

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    setLeftWidth((w) => {
      storeSplitWidth(w)
      return w
    })
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => onPointerMove(e.clientX)
    const up = () => onPointerUp()
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [onPointerMove, onPointerUp])

  useEffect(() => {
    const onResize = () => {
      setLeftWidth((w) => clampSplitWidth(w, window.innerWidth, minWidth, maxRatio))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [minWidth, maxRatio])

  return { leftWidth, onPointerDown, onPointerMove, onPointerUp }
}
