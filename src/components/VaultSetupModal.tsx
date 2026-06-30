import { useState } from "react"

/** Props for {@link VaultSetupModal}. */
export interface VaultSetupModalProps {
  onComplete: () => void
  onCancel: () => void
}

/** First-time passphrase setup for the encrypted secrets vault. */
export function VaultSetupModal({ onComplete, onCancel }: VaultSetupModalProps) {
  const [passphrase, setPassphrase] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.")
      return
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match.")
      return
    }
    setBusy(true)
    try {
      const { setupBrowserVault } = await import("@executioncontrolprotocol/browser")
      await setupBrowserVault(passphrase)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-overlay modal-overlay--elevated"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-setup-title"
    >
      <div className="modal-panel">
        <header className="modal-panel-header">
          <h2 id="vault-setup-title" className="font-display text-headline text-on-surface">
            Create secrets vault
          </h2>
        </header>

        <div className="modal-panel-scroll flex flex-col gap-4">
          <p className="text-body text-on-surface-variant">
            Cloud provider API keys are stored encrypted in this browser. Choose a passphrase you will
            need each session to unlock the vault.
          </p>
          <label className="flex flex-col gap-1 text-body">
            <span>Passphrase</span>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoComplete="new-password"
            />
          </label>
          <label className="flex flex-col gap-1 text-body">
            <span>Confirm passphrase</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoComplete="new-password"
            />
          </label>
          {error ? <p className="text-body text-error">{error}</p> : null}
        </div>

        <footer className="modal-panel-footer">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="flex-1 rounded bg-primary py-2.5 font-mono text-label font-bold text-on-primary transition-[filter] hover:brightness-110 disabled:opacity-50"
            >
              Create vault
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-outline-variant px-4 py-2.5 font-mono text-label text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              Cancel
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
