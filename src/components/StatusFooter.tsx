import { useState } from "react"
import type { ValidationResult } from "@executioncontextprotocol/types"
import { ValidationView } from "./ValidationView.js"

/** Props for {@link StatusFooter}. */
export interface StatusFooterProps {
  validation: ValidationResult | null
}

/** Persistent status bar with validation pill. */
export function StatusFooter({ validation }: StatusFooterProps) {
  const [showValidation, setShowValidation] = useState(false)
  const isValid = validation?.valid ?? true
  const hasResult = validation !== null

  return (
    <>
      <footer className="status-footer" id="status-footer">
        {hasResult && !isValid ? (
          <button
            type="button"
            className="status-pill status-pill--invalid"
            onClick={() => setShowValidation(true)}
            aria-label="Show validation issues"
          >
            <span aria-hidden className="status-pill-dot status-pill-dot--invalid" />
            <span>Invalid</span>
          </button>
        ) : (
          <div className="status-pill status-pill--valid">
            <span aria-hidden className="status-pill-dot" />
            <span>{hasResult ? "Valid" : "Ready"}</span>
          </div>
        )}
      </footer>

      {showValidation && validation && !validation.valid ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-background/70 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Validation issues"
        >
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container p-6 glow-primary">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-headline text-on-surface">Validation</h2>
              <button
                type="button"
                className="material-symbols-outlined cursor-pointer text-on-surface-variant hover:text-on-surface"
                onClick={() => setShowValidation(false)}
                aria-label="Close"
              >
                close
              </button>
            </div>
            <ValidationView validation={validation} />
          </div>
        </div>
      ) : null}
    </>
  )
}
