import { useState } from "react"
import type { ValidationResult } from "@executioncontrolprotocol/types"
import { GITHUB_REPO_URL } from "../lib/external-links.js"
import { ValidationView } from "./ValidationView.js"

/** Props for {@link StatusFooter}. */
export interface StatusFooterProps {
  validation: ValidationResult | null
}

/** GitHub mark icon for footer link. */
function GitHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

/** Persistent status bar with validation pill and GitHub link. */
export function StatusFooter({ validation }: StatusFooterProps) {
  const [showValidation, setShowValidation] = useState(false)
  const isValid = validation?.valid ?? true
  const hasResult = validation !== null

  return (
    <>
      <footer className="status-footer w-full" id="status-footer">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center">
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
          </div>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-github-link text-on-surface-variant hover:text-on-surface"
            aria-label="GitHub repository"
          >
            <GitHubIcon />
          </a>
        </div>
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
