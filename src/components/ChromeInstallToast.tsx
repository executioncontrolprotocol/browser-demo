import type { ChromeInstallSnapshot } from "../lib/provider-mode.js"

/** Props for {@link ChromeInstallToast}. */
export interface ChromeInstallToastProps {
  state: ChromeInstallSnapshot
  visible: boolean
}

function progressLabel(state: ChromeInstallSnapshot): string {
  if (state.phase === "error") return state.error ?? "Install failed"
  if (state.phase === "ready") return "Chrome AI ready"
  if (state.phase === "loading") return "Loading model..."
  if (state.loaded !== undefined && state.total && state.total > 0) {
    const pct = Math.min(100, Math.round((state.loaded / state.total) * 100))
    return `Downloading ${pct}%`
  }
  return "Downloading Chrome AI..."
}

/** Bottom-right install progress toast. */
export function ChromeInstallToast({ state, visible }: ChromeInstallToastProps) {
  if (!visible || state.phase === "idle" || state.phase === "ready") return null

  const isError = state.phase === "error"

  return (
    <aside
      className="fixed bottom-6 right-6 z-[45] flex max-w-xs items-center gap-3 rounded-lg border border-outline-variant bg-surface-container px-4 py-3 shadow-lg"
      aria-live="polite"
      aria-label="Chrome AI installation progress"
    >
      {!isError ? (
        <span
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-outline-variant border-t-primary"
          aria-hidden
        />
      ) : (
        <span className="material-symbols-outlined text-error text-sm">error</span>
      )}
      <span className="font-mono text-label text-on-surface">{progressLabel(state)}</span>
    </aside>
  )
}
