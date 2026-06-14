import { describe, expect, it, vi, beforeEach } from "vitest"

const hasBrowserVault = vi.fn(() => false)
const isBrowserVaultUnlocked = vi.fn(() => false)

vi.mock("@executioncontextprotocol/browser", () => ({
  hasBrowserVault: () => hasBrowserVault(),
  isBrowserVaultUnlocked: () => isBrowserVaultUnlocked(),
}))

import { shouldBlockForVault } from "../src/lib/vault-gate.js"

describe("vault gate", () => {
  beforeEach(() => {
    hasBrowserVault.mockReturnValue(false)
    isBrowserVaultUnlocked.mockReturnValue(false)
  })

  it("does not block when no vault exists", () => {
    expect(shouldBlockForVault()).toBe(false)
  })

  it("blocks when vault exists but is locked", () => {
    hasBrowserVault.mockReturnValue(true)
    isBrowserVaultUnlocked.mockReturnValue(false)
    expect(shouldBlockForVault()).toBe(true)
  })

  it("does not block when vault is unlocked", () => {
    hasBrowserVault.mockReturnValue(true)
    isBrowserVaultUnlocked.mockReturnValue(true)
    expect(shouldBlockForVault()).toBe(false)
  })
})
