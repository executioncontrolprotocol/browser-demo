import type { ValidationResult } from "@executioncontextprotocol/types"

/** Validation result display. */
export function ValidationView({ validation }: { validation: ValidationResult | null }) {
  if (!validation) return <p className="text-body text-on-surface-variant">No validation result yet.</p>
  if (validation.valid) return <p className="text-body text-primary">Workflow is valid.</p>
  return (
    <ul className="list-inside list-disc space-y-2 text-body text-on-surface">
      {[...validation.errors, ...validation.warnings].map((issue, i) => (
        <li key={`${issue.code}-${i}`}>
          <strong className="text-primary">{issue.severity}</strong> [{issue.code}] {issue.message}
          {issue.path ? ` (${issue.path})` : ""}
        </li>
      ))}
    </ul>
  )
}
