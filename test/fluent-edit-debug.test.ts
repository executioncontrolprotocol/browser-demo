import { describe, expect, it, vi, afterEach } from "vitest"
import { isFluentEditDebugEnabled } from "../src/lib/fluent-edit-debug.js"

describe("isFluentEditDebugEnabled", () => {
  afterEach(() => {
    delete (globalThis as { __ecpFluentEditDebug?: boolean }).__ecpFluentEditDebug
  })

  it("can be disabled via globalThis.__ecpFluentEditDebug = false", () => {
    ;(globalThis as { __ecpFluentEditDebug?: boolean }).__ecpFluentEditDebug = false
    expect(isFluentEditDebugEnabled()).toBe(false)
  })

  it("is enabled in dev when global flag is not false", () => {
    expect(import.meta.env.DEV).toBe(true)
    expect(isFluentEditDebugEnabled()).toBe(true)
  })
})

describe("fluent edit debug logging", () => {
  it("does not throw when logging helpers are called", async () => {
    const { logFluentCompileSkipped, logFluentChangeReceived } = await import(
      "../src/lib/fluent-edit-debug.js"
    )
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    logFluentCompileSkipped("test")
    logFluentChangeReceived(10, 1)
    spy.mockRestore()
  })
})
