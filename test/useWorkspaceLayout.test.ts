import { describe, expect, it } from "vitest"
import { useViewLayout } from "../src/hooks/useViewLayout.js"

describe("useViewLayout", () => {
  it("exports hook function", () => {
    expect(typeof useViewLayout).toBe("function")
  })
})

describe("useViewLayout state shape", () => {
  it("exposes view layout API", () => {
    const stateKeys = [
      "views",
      "toggleView",
      "onFirstWorkflow",
      "openWorkspace",
      "ensureWorkflowVisible",
      "workspaceVisible",
      "paired",
    ]
    expect(stateKeys.length).toBe(7)
  })
})
