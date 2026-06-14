import { hasBrowserVault, isBrowserVaultUnlocked } from "@executioncontextprotocol/browser"

/** Whether the demo should show the vault unlock modal before initializing ECP. */
export function shouldBlockForVault(): boolean {
  return hasBrowserVault() && !isBrowserVaultUnlocked()
}
