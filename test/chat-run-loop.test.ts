import { describe, expect, it } from "vitest"
import {
  CHAT_AUTO_TROUBLESHOOT_MAX,
  canAutoTroubleshoot,
  formatChatRunFailureMessage,
  formatChatRunSuccessMessage,
  isHarnessRunResultDocument,
  isProbeOfferConfirm,
  isProbeOfferDecline,
  isRunOfferConfirm,
  isRunOfferDecline,
  resolvePendingOfferAction,
  resolvePendingProbeOfferAction,
} from "../src/lib/chat-run-loop.js"

describe("chat-run-loop confirm/decline", () => {
  it("accepts bare confirmations", () => {
    expect(isRunOfferConfirm("yes")).toBe(true)
    expect(isRunOfferConfirm("run it")).toBe(true)
    expect(isRunOfferConfirm("Sure")).toBe(true)
  })

  it("rejects authoring that starts with yes", () => {
    expect(isRunOfferConfirm("yes add a notify step")).toBe(false)
    expect(resolvePendingOfferAction("yes add a notify step")).toBe("cancel-and-chat")
  })

  it("accepts declines", () => {
    expect(isRunOfferDecline("not now")).toBe(true)
    expect(resolvePendingOfferAction("no")).toBe("decline")
  })
})

describe("chat-run-loop probe confirm/decline", () => {
  it("confirms a pending probe offer", () => {
    expect(isProbeOfferConfirm("yes")).toBe(true)
    expect(resolvePendingProbeOfferAction("run it")).toBe("confirm")
  })

  it("declines a pending probe offer", () => {
    expect(isProbeOfferDecline("not now")).toBe(true)
    expect(resolvePendingProbeOfferAction("no")).toBe("decline")
  })

  it("allows a later run offer after probe confirmation", () => {
    expect(resolvePendingProbeOfferAction("yes")).toBe("confirm")
    expect(resolvePendingOfferAction("yes")).toBe("confirm")
  })

  it("cancels the probe offer for a new authoring request", () => {
    expect(resolvePendingProbeOfferAction("yes, add a resize step")).toBe("cancel-and-chat")
  })
})

describe("chat-run-loop auto-troubleshoot", () => {
  it("allows rounds below the cap", () => {
    expect(canAutoTroubleshoot(0)).toBe(true)
    expect(canAutoTroubleshoot(CHAT_AUTO_TROUBLESHOOT_MAX - 1)).toBe(true)
    expect(canAutoTroubleshoot(CHAT_AUTO_TROUBLESHOOT_MAX)).toBe(false)
  })
})

describe("chat-run-loop messages", () => {
  it("formats success without embedding output JSON", () => {
    const msg = formatChatRunSuccessMessage({
      schema: "@executioncontrolprotocol.run.result",
      version: "1.0",
      run: { id: "r1", status: "completed" },
      output: { echo: "hello" },
    })
    expect(msg.toLowerCase()).toContain("completed")
    expect(msg).not.toContain("hello")
  })

  it("formats failure from error wrapper", () => {
    expect(formatChatRunFailureMessage({ error: "boom" })).toContain("boom")
  })

  it("detects harness run result documents", () => {
    expect(
      isHarnessRunResultDocument({
        schema: "@executioncontrolprotocol.run.result",
        version: "1.0",
        run: { id: "r1", status: "failed" },
      })
    ).toBe(true)
    expect(isHarnessRunResultDocument({ error: "x" })).toBe(false)
  })
})
