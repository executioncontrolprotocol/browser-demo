/** Props for {@link PanelHeader}. */
export interface PanelHeaderProps {
  /** Material Symbols icon name. */
  icon: string
  /** Uppercase panel title. */
  label: string
}

/** Unified panel chrome header (Logic Source style). */
export function PanelHeader({ icon, label }: PanelHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-outline-variant bg-surface-container-low p-3">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <span className="font-mono text-label uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
    </div>
  )
}
