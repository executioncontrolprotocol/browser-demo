import { useState } from "react"

/** Props for {@link VaultUnlockModal}. */
export interface VaultUnlockModalProps {
  onUnlocked: () => void
  onSkip: () => void
}

/** Unlock an existing encrypted secrets vault. */
export function VaultUnlockModal({ onUnlocked, onSkip }: VaultUnlockModalProps) {
  const [passphrase, setPassphrase] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const { unlockBrowserVault } = await import("@executioncontrolprotocol/browser")
      const ok = await unlockBrowserVault(passphrase)
      if (!ok) {
        setError("Incorrect passphrase.")
        return
      }
      onUnlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-unlock-title"
    >
      <div className="flex w-[min(420px,92vw)] flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container p-6">
        <h2 id="vault-unlock-title" className="font-display text-headline text-on-surface">
          Unlock secrets vault
        </h2>
        <p className="text-body text-on-surface-variant">
          Enter your vault passphrase to use stored cloud API keys. You can explore the demo without
          unlocking.
        </p>
        <label className="flex flex-col gap-1 text-body">
          <span>Passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit()
            }}
            className="rounded border border-outline-variant bg-surface px-3 py-2 font-mono text-body"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-body text-error">{error}</p> : null}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !passphrase}
          className="rounded bg-primary py-2.5 font-mono text-label font-bold text-on-primary hover:brightness-110 disabled:opacity-50"
        >
          Unlock
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-body text-on-surface-variant underline hover:text-on-surface"
        >
          Explore without cloud keys
        </button>
      </div>
    </div>
  )
}
