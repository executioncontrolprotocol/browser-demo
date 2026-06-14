import type { ValidationResult } from "@executioncontextprotocol/types"
import type { AppNavTab } from "../types/workspace.js"

/** Props for {@link TopAppBar}. */
export interface TopAppBarProps {
  activeNav: AppNavTab
  onNavChange: (tab: AppNavTab) => void
  onExecute: () => void
  executeDisabled?: boolean
  executeBusy?: boolean
  onSettings: () => void
  validation: ValidationResult | null
}

const NAV_ITEMS: { id: AppNavTab; label: string }[] = [
  { id: "editor", label: "Editor" },
  { id: "validation", label: "Validation" },
  { id: "run", label: "Run output" },
]

/** Top application bar with nav and actions. */
export function TopAppBar({
  activeNav,
  onNavChange,
  onExecute,
  executeDisabled,
  executeBusy,
  onSettings,
  validation,
}: TopAppBarProps) {
  const hasIssues = validation !== null && !validation.valid

  return (
    <header className="relative z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-gutter">
      <div className="flex items-center gap-8">
        <span className="font-display text-headline font-bold text-on-surface">ECP Graph Editor</span>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavChange(id)}
              className={`cursor-pointer font-mono text-label uppercase tracking-widest transition-colors ${
                activeNav === id
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {label}
              {id === "validation" && hasIssues ? (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-error" aria-hidden />
              ) : null}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="rounded border border-outline-variant px-4 py-1.5 font-mono text-label text-on-surface opacity-60"
            title="Save is not yet implemented"
          >
            Save
          </button>
          <button
            type="button"
            disabled={executeDisabled || executeBusy}
            onClick={onExecute}
            className="rounded bg-primary px-4 py-1.5 font-mono text-label font-bold text-on-primary transition-transform hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {executeBusy ? "Running..." : "Execute"}
          </button>
        </div>
        <div className="mx-2 h-6 w-px bg-outline-variant" />
        <button
          type="button"
          onClick={onSettings}
          className="material-symbols-outlined cursor-pointer text-on-surface-variant transition-colors hover:text-on-surface"
          aria-label="Settings"
        >
          settings
        </button>
      </div>
    </header>
  )
}
