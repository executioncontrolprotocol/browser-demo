import { describe, expect, it } from "vitest"
import {
  activeViewCount,
  columnWidthClass,
  DEFAULT_VIEW_STATE,
  isPairedLayout,
  isWorkspaceVisible,
  toggleViewPanel,
  viewStateAfterFirstWorkflow,
} from "../src/lib/view-layout.js"

describe("view-layout", () => {
  it("defaults to chat-only full width", () => {
    expect(DEFAULT_VIEW_STATE).toEqual({ chat: true, workflow: false, flow: false, code: false })
    expect(isWorkspaceVisible(DEFAULT_VIEW_STATE)).toBe(false)
    expect(isPairedLayout(DEFAULT_VIEW_STATE)).toBe(false)
    expect(columnWidthClass(false)).toBe("is-full")
  })

  it("prevents deactivating the last active panel", () => {
    const next = toggleViewPanel(DEFAULT_VIEW_STATE, "chat")
    expect(next).toEqual(DEFAULT_VIEW_STATE)
  })

  it("activates workflow and deactivates code and flow", () => {
    const withCode = { chat: true, workflow: false, flow: false, code: true }
    const next = toggleViewPanel(withCode, "workflow")
    expect(next).toEqual({ chat: true, workflow: true, flow: false, code: false })
  })

  it("activates flow and deactivates workflow and code", () => {
    const withWorkflow = { chat: true, workflow: true, flow: false, code: false }
    const next = toggleViewPanel(withWorkflow, "flow")
    expect(next).toEqual({ chat: true, workflow: false, flow: true, code: false })
  })

  it("activates code and deactivates workflow and flow", () => {
    const withFlow = { chat: true, workflow: false, flow: true, code: false }
    const next = toggleViewPanel(withFlow, "code")
    expect(next).toEqual({ chat: true, workflow: false, flow: false, code: true })
  })

  it("deactivates workflow when more than one panel is active", () => {
    const state = { chat: true, workflow: true, flow: false, code: false }
    const next = toggleViewPanel(state, "workflow")
    expect(next).toEqual({ chat: true, workflow: false, flow: false, code: false })
  })

  it("detects paired layout when chat and workspace are both active", () => {
    const state = { chat: true, workflow: false, flow: true, code: false }
    expect(isPairedLayout(state)).toBe(true)
    expect(columnWidthClass(true)).toBe("is-half")
    expect(activeViewCount(state)).toBe(2)
  })

  it("enables workflow on first workflow while keeping chat", () => {
    const next = viewStateAfterFirstWorkflow(DEFAULT_VIEW_STATE)
    expect(next).toEqual({ chat: true, workflow: true, flow: false, code: false })
    expect(isPairedLayout(next)).toBe(true)
  })
})
