import { useCallback, useEffect, useRef, useState } from "react"
import {
  CHROME_MODEL_STALL_HINT,
  getModelInstallState,
  isChromeModelInstallStalled,
  startModelDownload,
} from "@executioncontrolprotocol/chrome-ai"
import type { ChromeInstallSnapshot } from "../lib/provider-mode.js"

const POLL_MS = 400

/**
 * Poll Chrome model install progress.
 *
 * `startInstall` must call `startModelDownload()` as the first action from a
 * click (before React state updates / awaits) so user activation is preserved.
 */
export function useChromeModelInstall(onReady: () => void) {
  const [installState, setInstallState] = useState<ChromeInstallSnapshot>({ phase: "idle" })
  const polling = useRef(false)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const lastProgressAt = useRef(Date.now())
  const lastLoaded = useRef<number | undefined>(undefined)

  const pollOnce = useCallback(() => {
    const snap = getModelInstallState() as ChromeInstallSnapshot
    if (
      typeof snap.loaded === "number" &&
      snap.loaded > 0 &&
      snap.loaded !== lastLoaded.current
    ) {
      lastLoaded.current = snap.loaded
      lastProgressAt.current = Date.now()
    }

    const stalled = isChromeModelInstallStalled({
      phase: snap.phase,
      status: snap.status,
      loaded: snap.loaded,
      lastProgressAt: lastProgressAt.current,
    })
    const next = stalled ? { ...snap, hint: snap.hint ?? CHROME_MODEL_STALL_HINT } : snap
    setInstallState(next)

    if (snap.phase === "ready") {
      polling.current = false
      onReadyRef.current()
    }
    if (snap.phase === "error") {
      polling.current = false
    }
  }, [])

  const startPolling = useCallback(() => {
    if (polling.current) return
    polling.current = true
    lastProgressAt.current = Date.now()
    lastLoaded.current = undefined
    const tick = () => {
      if (!polling.current) return
      pollOnce()
      if (polling.current) {
        setTimeout(tick, POLL_MS)
      }
    }
    pollOnce()
    setTimeout(tick, POLL_MS)
  }, [pollOnce])

  /**
   * Kick LanguageModel.create() synchronously, then poll.
   * Do not await anything before this returns from the click stack.
   */
  const startInstall = useCallback(() => {
    void startModelDownload()
    startPolling()
  }, [startPolling])

  const stopPolling = useCallback(() => {
    polling.current = false
  }, [])

  useEffect(
    () => () => {
      polling.current = false
    },
    []
  )

  return { installState, startInstall, startPolling, stopPolling }
}
