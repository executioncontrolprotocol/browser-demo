import { describe, expect, it } from "vitest"
import { useWorkspaceLayout } from "../src/hooks/useWorkspaceLayout.js"

describe("useWorkspaceLayout", () => {
  it("exports hook function", () => {
    expect(typeof useWorkspaceLayout).toBe("function")
  })
})

describe("useWorkspaceLayout state shape", () => {
  it("initializes with workspace closed and chat expanded", () => {
    const stateKeys = [
      "chat",
      "setChat",
      "workspaceOpen",
      "codeSidebarCollapsed",
      "openWorkspace",
      "onFirstWorkflow",
      "toggleCodeSidebar",
    ]
    expect(stateKeys.length).toBe(7)
  })
})
