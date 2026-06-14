import { useCallback, useEffect, useRef, useState } from "react"
import type { Ecp } from "@executioncontextprotocol/core"
import type { ChromeInstallSnapshot } from "../lib/provider-mode.js"

const POLL_MS = 400

/** Poll Chrome model install progress via ECP capabilities. */
export function useChromeModelInstall(onReady: () => void) {
  const [installState, setInstallState] = useState<ChromeInstallSnapshot>({ phase: "idle" })
  const polling = useRef(false)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  const pollOnce = useCallback(async (ecp: Ecp) => {
    const result = await ecp.invoke("@executioncontextprotocol/chrome-ai.getModelInstallState").with({}).process()
    if (!result.success || !result.result) return
    const snap = result.result as ChromeInstallSnapshot
    setInstallState(snap)
    if (snap.phase === "ready") {
      polling.current = false
      onReadyRef.current()
    }
    if (snap.phase === "error") {
      polling.current = false
    }
  }, [])

  const startPolling = useCallback(
    (ecp: Ecp) => {
      if (polling.current) return
      polling.current = true
      const tick = () => {
        if (!polling.current) return
        void pollOnce(ecp).then(() => {
          if (polling.current) {
            setTimeout(tick, POLL_MS)
          }
        })
      }
      void pollOnce(ecp)
      setTimeout(tick, POLL_MS)
    },
    [pollOnce]
  )

  const startInstall = useCallback(
    async (ecp: Ecp) => {
      await ecp.invoke("@executioncontextprotocol/chrome-ai.startModelDownload").with({}).process()
      startPolling(ecp)
    },
    [startPolling]
  )

  const stopPolling = useCallback(() => {
    polling.current = false
  }, [])

  useEffect(() => () => {
    polling.current = false
  }, [])

  return { installState, startInstall, startPolling, stopPolling, setInstallState }
}
