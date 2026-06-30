import { describe, expect, it } from "vitest"

/** Mirrors App.tsx bootstrap guard — must not depend on unstable hook return objects. */
function bootstrapOnce(alreadyBootstrapped: { current: boolean }): boolean {
  if (alreadyBootstrapped.current) return false
  alreadyBootstrapped.current = true
  return true
}

describe("bootstrap guard", () => {
  it("allows only one bootstrap per session", () => {
    const flag = { current: false }
    expect(bootstrapOnce(flag)).toBe(true)
    expect(bootstrapOnce(flag)).toBe(false)
    expect(bootstrapOnce(flag)).toBe(false)
  })
})
