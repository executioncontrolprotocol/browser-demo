import type { ChromeInstallSnapshot } from "../lib/provider-mode.js"

/** Progress percent for Chrome install UI (null when unknown). */
export function chromeInstallProgressPercent(state: ChromeInstallSnapshot): number | null {
  if (state.loaded === undefined) return null
  if (state.total && state.total > 0) {
    return Math.min(100, Math.round((state.loaded / state.total) * 100))
  }
  if (state.loaded >= 0 && state.loaded <= 100 && state.total === undefined) {
    return Math.min(100, Math.round(state.loaded))
  }
  return null
}

/** Whether the install UI should treat this as a stalled download. */
export function isChromeInstallStalledUi(state: ChromeInstallSnapshot): boolean {
  return Boolean(state.hint) && state.phase !== "error" && state.phase !== "ready"
}

/** Short footer / dialog status label. */
export function chromeInstallStatusLabel(state: ChromeInstallSnapshot): string {
  if (state.phase === "error") return "Install failed"
  if (state.phase === "loading") return "Loading model"
  if (state.phase === "checking") return "Checking model"
  if (isChromeInstallStalledUi(state)) return "Download stuck"
  return "Downloading"
}

/** Longer message for hover / title (hint, error, or phase detail). */
export function chromeInstallDetailMessage(state: ChromeInstallSnapshot): string {
  if (state.phase === "error") return state.error ?? "Chrome AI installation failed."
  if (state.hint) return state.hint
  if (state.phase === "loading") return "Loading the on-device model into memory."
  if (state.phase === "checking") return "Checking Chrome built-in AI availability."
  const percent = chromeInstallProgressPercent(state)
  if (percent !== null) return `Gemini Nano is downloading (${percent}%).`
  return "Gemini Nano is downloading to your browser."
}

/** Whether footer should show Chrome install status. */
export function shouldShowChromeInstallFooter(
  ui: "idle" | "dialog" | "toast" | "done",
  state: ChromeInstallSnapshot
): boolean {
  if (ui !== "toast") return false
  return state.phase !== "ready" && state.phase !== "idle"
}
