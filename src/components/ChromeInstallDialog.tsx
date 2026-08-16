import type { ChromeInstallSnapshot } from "../lib/provider-mode.js"
import {
  chromeInstallDetailMessage,
  chromeInstallProgressPercent,
  chromeInstallStatusLabel,
  isChromeInstallStalledUi,
} from "../lib/chrome-install-ui.js"

/** Props for {@link ChromeInstallDialog}. */
export interface ChromeInstallDialogProps {
  state: ChromeInstallSnapshot
  onContinueInBackground: () => void
  onCancel: () => void
}

/** Blocking dialog while Chrome AI model downloads. */
export function ChromeInstallDialog({ state, onContinueInBackground, onCancel }: ChromeInstallDialogProps) {
  const percent = chromeInstallProgressPercent(state)
  const isError = state.phase === "error"
  const stalled = isChromeInstallStalledUi(state)
  const statusLabel = chromeInstallStatusLabel(state)
  const detail = chromeInstallDetailMessage(state)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chrome-install-title"
    >
      <div className="flex w-[min(440px,92vw)] flex-col gap-5 overflow-visible rounded-xl border border-outline-variant bg-surface-container p-6 glow-primary">
        <h2 id="chrome-install-title" className="font-display text-headline text-on-surface">
          Installing Chrome AI
        </h2>
        <p className="text-body text-on-surface-variant">
          Gemini Nano is downloading to your browser. This may take a few minutes on first use.
        </p>

        {isError ? (
          <p className="text-body text-error">{state.error ?? "Installation failed."}</p>
        ) : (
          <div className="space-y-3 overflow-visible">
            <div className="status-pill-wrap">
              <div
                className="flex cursor-help items-center gap-3"
                tabIndex={0}
                aria-describedby="chrome-install-dialog-popover"
              >
                {stalled ? (
                  <span className="material-symbols-outlined text-lg text-error" aria-hidden>
                    warning
                  </span>
                ) : (
                  <span
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary"
                    aria-hidden
                  />
                )}
                <span className="font-mono text-label text-on-surface-variant">{statusLabel}</span>
                {percent !== null ? (
                  <span className="font-mono text-label text-on-surface">{percent}%</span>
                ) : null}
              </div>
              <div
                id="chrome-install-dialog-popover"
                role="tooltip"
                className="status-pill-popover status-pill-popover--start"
              >
                {detail}
              </div>
            </div>
            {percent !== null ? (
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-lowest">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percent}%` }}
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            ) : !stalled ? (
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-lowest">
                <div className="h-full w-1/3 animate-pulse bg-primary/60" />
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-outline-variant px-4 py-2 font-mono text-label text-on-surface hover:bg-surface-container-high"
          >
            Cancel
          </button>
          {!isError ? (
            <button
              type="button"
              onClick={onContinueInBackground}
              className="rounded bg-primary px-4 py-2 font-mono text-label font-bold text-on-primary hover:brightness-110"
            >
              Continue in background
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
