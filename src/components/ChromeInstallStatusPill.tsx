import type { ChromeInstallSnapshot } from "../lib/provider-mode.js"
import {
  chromeInstallDetailMessage,
  chromeInstallProgressPercent,
  chromeInstallStatusLabel,
  isChromeInstallStalledUi,
} from "../lib/chrome-install-ui.js"

/** Props for {@link ChromeInstallStatusPill}. */
export interface ChromeInstallStatusPillProps {
  state: ChromeInstallSnapshot
  /** Popover alignment relative to the pill. */
  popoverAlign?: "start" | "end"
  /** Stable id for aria-describedby (unique per mount surface). */
  popoverId?: string
  /** Extra class on the outer wrap. */
  className?: string
}

/**
 * Compact Chrome AI install status with in-app hover/focus popover.
 * Shared by the footer bar and the install dialog.
 */
export function ChromeInstallStatusPill({
  state,
  popoverAlign = "end",
  popoverId = "chrome-install-status-popover",
  className = "",
}: ChromeInstallStatusPillProps) {
  const stalled = isChromeInstallStalledUi(state)
  const isError = state.phase === "error"
  const percent = chromeInstallProgressPercent(state)
  const label = chromeInstallStatusLabel(state)
  const detail = chromeInstallDetailMessage(state)
  const pillClass = isError
    ? "status-pill status-pill--invalid"
    : stalled
      ? "status-pill status-pill--warn"
      : "status-pill status-pill--valid"

  return (
    <div className={`status-pill-wrap ${className}`.trim()}>
      <div
        className={`${pillClass} status-pill--has-popover`}
        tabIndex={0}
        aria-describedby={popoverId}
      >
        {isError || stalled ? (
          <span className="material-symbols-outlined status-pill-icon" aria-hidden>
            warning
          </span>
        ) : (
          <span className="status-pill-spinner" aria-hidden />
        )}
        <span>{label}</span>
        {percent !== null && !isError ? <span className="status-pill-meta">{percent}%</span> : null}
      </div>
      <div
        id={popoverId}
        role="tooltip"
        className={`status-pill-popover ${
          popoverAlign === "start" ? "status-pill-popover--start" : "status-pill-popover--end"
        }`}
      >
        {detail}
      </div>
    </div>
  )
}

