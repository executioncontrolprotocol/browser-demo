import { useState } from "react"
import {
  hasBrowserVault,
  isBrowserVaultUnlocked,
  setBrowserSecret,
} from "@executioncontrolprotocol/browser"

/** Props for {@link ProviderApiKeyFields}. */
export interface ProviderApiKeyFieldsProps {
  onRequestVaultSetup: () => void
}

/** Paste cloud provider API keys into the encrypted vault. */
export function ProviderApiKeyFields({ onRequestVaultSetup }: ProviderApiKeyFieldsProps) {
  const [openaiKey, setOpenaiKey] = useState("")
  const [claudeKey, setClaudeKey] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const vaultReady = hasBrowserVault() && isBrowserVaultUnlocked()

  const save = async () => {
    if (!vaultReady) {
      onRequestVaultSetup()
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      if (openaiKey.trim()) {
        await setBrowserSecret("OPENAI_API_KEY", openaiKey.trim())
      }
      if (claudeKey.trim()) {
        await setBrowserSecret("ANTHROPIC_API_KEY", claudeKey.trim())
      }
      setOpenaiKey("")
      setClaudeKey("")
      setStatus("API keys saved to encrypted vault.")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant p-3">
      <p className="font-mono text-label font-bold text-on-surface">Encrypted API keys</p>
      {!hasBrowserVault() ? (
        <p className="text-body text-on-surface-variant">
          Create a vault to store OpenAI and Claude keys locally (encrypted).
        </p>
      ) : !isBrowserVaultUnlocked() ? (
        <p className="text-body text-on-surface-variant">Unlock the vault to store or update keys.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-body">
            <span>OpenAI API key</span>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-body">
            <span>Claude API key</span>
            <input
              type="password"
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
              autoComplete="off"
            />
          </label>
        </>
      )}
      {status ? <p className="text-body text-on-surface-variant">{status}</p> : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="rounded border border-outline-variant px-3 py-2 font-mono text-label text-on-surface hover:bg-surface-container-high disabled:opacity-50"
      >
        {vaultReady ? "Save keys" : "Set up vault"}
      </button>
    </div>
  )
}
