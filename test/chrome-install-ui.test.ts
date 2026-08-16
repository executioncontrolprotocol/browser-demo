import { describe, expect, it } from "vitest"
import {
  chromeInstallProgressPercent,
  chromeInstallStatusLabel,
  isChromeInstallStalledUi,
  shouldShowChromeInstallFooter,
} from "../src/lib/chrome-install-ui.js"

describe("chrome-install-ui", () => {
  it("computes progress percent from loaded/total", () => {
    expect(chromeInstallProgressPercent({ phase: "downloading", loaded: 42, total: 100 })).toBe(42)
  })

  it("labels stalled downloads and shows them in the footer toast mode", () => {
    const stalled = {
      phase: "downloading",
      status: "downloading",
      hint: "Download looks stuck",
    }
    expect(isChromeInstallStalledUi(stalled)).toBe(true)
    expect(chromeInstallStatusLabel(stalled)).toBe("Download stuck")
    expect(shouldShowChromeInstallFooter("toast", stalled)).toBe(true)
    expect(shouldShowChromeInstallFooter("dialog", stalled)).toBe(false)
  })
})
