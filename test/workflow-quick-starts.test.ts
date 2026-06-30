import { describe, expect, it } from "vitest"
import {
  WORKFLOW_QUICK_STARTS,
  shouldShowWorkflowQuickStarts,
} from "../src/lib/workflow-quick-starts.js"
import type { ChatMessage } from "../src/types/workspace.js"

describe("WORKFLOW_QUICK_STARTS", () => {
  it("defines exactly three quick starts with label and prompt", () => {
    expect(WORKFLOW_QUICK_STARTS).toHaveLength(3)
    for (const item of WORKFLOW_QUICK_STARTS) {
      expect(item.label.trim().length).toBeGreaterThan(0)
      expect(item.prompt.trim().length).toBeGreaterThan(0)
    }
  })
})

describe("shouldShowWorkflowQuickStarts", () => {
  it("returns true when only agent messages exist", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "agent", text: "Welcome" },
    ]
    expect(shouldShowWorkflowQuickStarts(messages)).toBe(true)
  })

  it("returns false after a user message", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "agent", text: "Welcome" },
      { id: "2", role: "user", text: "Build a workflow" },
    ]
    expect(shouldShowWorkflowQuickStarts(messages)).toBe(false)
  })
})
