/** Clamp a split-pane left width between min and max. */
export function clampSplitWidth(width: number, viewportWidth: number, min = 280, maxRatio = 0.55): number {
  const max = Math.floor(viewportWidth * maxRatio)
  return Math.min(max, Math.max(min, width))
}

const STORAGE_KEY = "ecp-browser-demo-split-width"
const DEFAULT_WIDTH = 380

/** Read persisted split width from sessionStorage. */
export function readStoredSplitWidth(): number {
  if (typeof sessionStorage === "undefined") return DEFAULT_WIDTH
  const raw = sessionStorage.getItem(STORAGE_KEY)
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) ? parsed : DEFAULT_WIDTH
}

/** Persist split width to sessionStorage. */
export function storeSplitWidth(width: number): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, String(width))
}

export { DEFAULT_WIDTH as SPLIT_DEFAULT_WIDTH, STORAGE_KEY as SPLIT_STORAGE_KEY }
